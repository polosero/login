var _tagsToReplace = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;'
};
function _replaceTag(tag) {
    return _tagsToReplace[tag] || tag;
}
function e(str) {
    if (typeof str === 'number')
        return str;
    return String(str).replace(/[&<>]/g, _replaceTag);
}
function md(str) {
    return _snarkdown_parse(e(str));
}

function template(id) {
    const template = document.getElementById(id);
    template || console.error('Unknown template', id);
    return document.importNode(template.content, true);
}



window.addEventListener('hashchange', _onHashChange);
window.addEventListener('load', _onHashChange);
function _onHashChange() {
    const hash = location.hash.startsWith('#') ? location.hash.slice(1) : location.hash;
    const [_m, name, id] = hash.match(/^(.+?)([0-9]*)$/) || ['', '', ''];
    document.body.setAttribute('data-hash', name || 'index');
    (_hashChangeRegisteredCbs[name] || []).forEach(data => _hashChangeApplyCb(data, id));
}
function _hashChangeApplyCb(data, id) {
    if (data.waitFor && !_xhrResolvedRequests.has(data.waitFor)) {
        console.log('hashchangeRegister waitFor', data.waitFor, id);
        setTimeout(_hashChangeApplyCb.bind(null, data, id), 1000);
        return;
    }
    data.cb(Number(id));
}
const _hashChangeRegisteredCbs = {};
function hashchangeRegister(hash, cb, waitFor) {
    if (!(hash in _hashChangeRegisteredCbs))
        _hashChangeRegisteredCbs[hash] = [];
    _hashChangeRegisteredCbs[hash].push({cb, waitFor});
}


_xhrResolvedRequests = new Set();
const ISLOCALHOST = window.location.href.includes('localhost:')
                 || window.location.href.startsWith('file:///');
const URL_BASE = ISLOCALHOST
    ? 'http://localhost:5000'
    : 'https://polosero.pythonanywhere.com';
function XHR(method, endpoint, data, asBlob) {
    if (!endpoint.startsWith('/'))
        throw new Error('endpoint must start with /');
    const request = new XMLHttpRequest();
    request.timeout = 5000;
    let formData;
    if (data){
        formData = new FormData();
        for (let key in data)
            formData.append(key, data[key]);
    }
    asBlob && (request.responseType = 'blob');
    return new Promise((resolve, reject) => {
        request.addEventListener("load", response => {
            if (request.readyState !== XMLHttpRequest.DONE)
                return;
            if (request.status >= 200 && request.status < 300) {
                _xhrResolvedRequests.add(endpoint);
                const type = request.getResponseHeader('Content-Type');
                if (type === 'application/json')
                    resolve(JSON.parse(request.responseText));
                else if (type.startsWith('image/')) {
                    const img = document.createElement('img');
                    img.src = URL.createObjectURL(request.response);
                    resolve(img);
                } else
                    throw new Error(`Invalid mimetype: ${type}`);
            } else if (request.status === 401) {
                console.log('login needed');
                reject('Unauthorized');
                if (typeof window.unauthorizedHandler === 'function' && !ISLOCALHOST)
                    window.unauthorizedHandler();
            } else if (response.status === 405) {
                reject('Method not allowed');
            } else {
                try {
                    reject(JSON.parse(asBlob ? request.response : request.responseText));
                } catch (e) {
                    reject(asBlob ? request.response : request.responseText);
                }
            }
        });
        request.addEventListener('error', err => {
            console.error(err);
        });
        request.addEventListener('timeout', () => {
            console.error('request timeout');
        });
        request.open(method, URL_BASE + (endpoint || ''));
        let token = sessionStorage.getItem('auth-token');
        if (!token) {
            for (const cookie of document.cookie.split(';')) {
                const [name, value] = cookie.split('=');
                if (name === 'auth-token')
                    token = value;
            }
        }
        token && request.setRequestHeader('Authorization', `Bearer ${token}`);
        request.send(formData);
    });
}


function redirectToLogin() {
    document.location.assign('https://login.polo-sero.cz#return');
}



function ignoreSubmit(form, event) {
    console.log('ignoreSubmit', form, event);
    event.stopPropagation();
    event.preventDefault();
}



function extractValueFromInput(element) {
    return element.type === 'number' ? Number(element.value) : element.value
}

function extract(element, result) {
    if (!result)
        result = {};
    let child;
    let i = 0;
    while (child = element.children.item(i++)) {
        if (child.name && 'value' in child)
            result[child.name] = extractValueFromInput(child);
        else
            extract(child, result);
    }
    return result;
}


function clearPasswordInputs(form) {
    for (const pass of form.querySelectorAll('input[type=password]'))
        pass.value = '';
}

function setError(form, msg) {
    msg && clearPasswordInputs(form);
    const el = form.querySelector('.error-msg');
    if (el)
        return el.innerText = msg || '';
    if (form.children.item(0).nodeName.toUpperCase() === 'FIELDSET')
        form = form.children.item(0);
    const newEl = document.createElement('div');
    newEl.classList.add('error-msg');
    newEl.innerText = msg || '';
    form.insertAdjacentElement('beforeend', newEl);
}

function setValues(form, values) {
    for (const name in values) {
        const input = form.querySelector(`[name=${name}]`);
        if (!input)
            continue;
        input.value = values[name];
        if (input.value !== values[name])
            input.setAttribute('data-value', values[name]);
        else
            input.removeAttribute('data-value');
    }
}

function setValuesByCls(el, values) {
    for (const name in values) {
        const input = el.querySelector(`.${name}`);
        if (!input)
            continue;
        input.innerHTML = values[name];
    }
}





// https://github.com/developit/snarkdown
/*
The MIT License (MIT)

Copyright (c) 2017 Jason Miller

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
const _snarkdown_parse = (function() {
const TAGS = {
    '' : ['<em>','</em>'],
    _ : ['<strong>','</strong>'],
    '~' : ['<s>','</s>'],
    '\n' : ['<br />'],
    ' ' : ['<br />'],
    '-': ['<hr />']
};

/** Outdent a string based on the first indented line's leading whitespace
 *	@private
 */
function outdent(str) {
    return str.replace(RegExp('^'+(str.match(/^(\t| )+/) || '')[0], 'gm'), '');
}

/** Encode special attribute characters to HTML entities in a String.
 *	@private
 */
function encodeAttr(str) {
    return (str+'').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Parse Markdown into an HTML String. */
return function parse(md, prevLinks) {
    md = md.replace(/\r\n/g, '\n');
    let tokenizer = /((?:^|\n+)(?:\n---+|\* \*(?: \*)+)\n)|(?:^``` *(\w*)\n([\s\S]*?)\n```$)|((?:(?:^|\n+)(?:\t|  {2,}).+)+\n*)|((?:(?:^|\n)([>*+-]|\d+\.)\s+.*)+)|(?:\!\[([^\]]*?)\]\(([^\)]+?)\))|(\[)|(\](?:\(([^\)]+?)\))?)|(?:(?:^|\n+)([^\s].*)\n(\-{3,}|={3,})(?:\n+|$))|(?:(?:^|\n+)(#{1,6})\s*(.+)(?:\n+|$))|(?:`([^`].*?)`)|(  \n\n*|\n{2,}|__|\*\*|[_*]|~~)/gm,
        context = [],
        out = '',
        links = prevLinks || {},
        last = 0,
        chunk, prev, token, inner, t;

    function tag(token) {
        var desc = TAGS[token.replace(/\*/g,'_')[1] || ''],
            end = context[context.length-1]==token;
        if (!desc) return token;
        if (!desc[1]) return desc[0];
        context[end?'pop':'push'](token);
        return desc[end|0];
    }

    function flush() {
        let str = '';
        while (context.length) str += tag(context[context.length-1]);
        return str;
    }

    md = md.replace(/^\[(.+?)\]:\s*(.+)$/gm, (s, name, url) => {
        links[name.toLowerCase()] = url;
        return '';
    }).replace(/^\n+|\n+$/g, '');

    while ( (token=tokenizer.exec(md)) ) {
        prev = md.substring(last, token.index);
        last = tokenizer.lastIndex;
        chunk = token[0];
        if (prev.match(/[^\\](\\\\)*\\$/)) {
            // escaped
        }
        // Code/Indent blocks:
        else if (token[3] || token[4]) {
            chunk = '<pre class="code '+(token[4]?'poetry':token[2].toLowerCase())+'">'+outdent(encodeAttr(token[3] || token[4]).replace(/^\n+|\n+$/g, ''))+'</pre>';
        }
        // > Quotes, -* lists:
        else if (token[6]) {
            t = token[6];
            if (t.match(/\./)) {
                token[5] = token[5].replace(/^\d+/gm, '');
            }
            inner = parse(outdent(token[5].replace(/^\s*[>*+.-]/gm, '')));
            if (t==='>') t = 'blockquote';
            else {
                t = t.match(/\./) ? 'ol' : 'ul';
                inner = inner.replace(/^(.*)(\n|$)/gm, '<li>$1</li>');
            }
            chunk = '<'+t+'>' + inner + '</'+t+'>';
        }
        // Images:
        else if (token[8]) {
            chunk = `<img src="${encodeAttr(token[8])}" alt="${encodeAttr(token[7])}">`;
        }
        // Links:
        else if (token[10]) {
            out = out.replace('<a>', `<a href="${encodeAttr(token[11] || links[prev.toLowerCase()])}">`);
            chunk = flush() + '</a>';
        }
        else if (token[9]) {
            chunk = '<a>';
        }
        // Headings:
        else if (token[12] || token[14]) {
            t = 'h' + (token[14] ? token[14].length : (token[13][0]==='='?1:2));
            chunk = '<'+t+'>' + parse(token[12] || token[15], links) + '</'+t+'>';
        }
        // `code`:
        else if (token[16]) {
            chunk = '<code>'+encodeAttr(token[16])+'</code>';
        }
        // Inline formatting: *em*, **strong** & friends
        else if (token[17] || token[1]) {
            chunk = tag(token[17] || '--');
        }
        out += prev;
        out += chunk;
    }

    return (out + md.substring(last) + flush()).trim();
} })()
