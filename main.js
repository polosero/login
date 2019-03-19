window.addEventListener('load', getData);

function unauthorizedHandler() {
    loginVisible(true);
}


function addPermission(form, event, user_id) {
    event.stopPropagation();
    event.preventDefault();
    const data = extract(form);
    setPermission(user_id, data.target, data.level);
}


function addUser(form, event) {
    event.stopPropagation();
    event.preventDefault();
    const data = extract(form);
    if (data.password !== data.password2) {
        setError(form, 'Hesla se neshodují');
        return;
    }
    XHR(
        'POST',
        '/auth/new-user',
        { nick: data.nick, password: data.password }
    ).then(response => {
        console.log('add-user:', response);
        setError(form);
        loadUsers();
        form.reset();
    }).catch(error => {
        console.error('add-user:', error);
        setError(form, error);
    });
}


function formSubmit(form, event) {
    event.stopPropagation();
    event.preventDefault();
    const data = extract(form);
    XHR(
        'POST',
        '/auth/login',
        { nick: data.nick, password: data.password }
    ).then(response => {
        console.log('login OK');
        sessionStorage.setItem('auth-token', response);
        document.cookie = `auth-token=${encodeURIComponent(response)}; domain=polo-sero.cz; secure; samesite=strict`;
        if (document.location.hash === 'return')
            document.location.history.back();
        loginVisible(false);
        setError(form);
        getData();
        form.reset();
    }).catch(error => {
        console.error('login:', error);
        setError(form, error);
    });
}

function logout() {
    XHR(
        'POST',
        '/auth/logout'
    ).then(response => {
        console.log('logout OK');
        document.cookie = 'auth-token=; domain=polo-sero.cz; secure; samesite=strict; expires=Thu, 01 Jan 1970 00:00:01 GMT';
        loginVisible(true);
    }).catch(err => {
        console.error(err);
    })
}

function getData() {
    XHR(
        'GET',
        '/auth/'
    ).then(response => {
        console.log('info:', response);
        document.getElementById('username').innerText = response.nick;
        loginVisible(false);
        displayPermissions(response.permissions);
        visibleByPermission(response.permissions['login']);
        if (response.permissions['login'] >= 2)
            loadUsers();
    }).catch(err => {
        console.error('info:', err);
    });
}


function loadUsers() {
    XHR(
        'GET',
        '/auth/user-list'
    ).then(response => {  // TODO: refactor
        console.log('users:', response);
        const list = document.getElementById('user-list');
        list.innerHTML = '';
        let lastId = -1;
        response.push({ id: -1 });
        for (const row of response) {
            if (row.id !== lastId && lastId > 0)
                list.innerHTML += `<dd>
                    <form onsubmit="addPermission(this, event, ${e(lastId)})" class="compact">
                        <input type="text" name="target" required />
                        <input type="number" name="level" min="0" max="10" required />
                        <button type="submit">Add</button>
                    </form>
                </dd>`;
            if (row.id < 0)
                break;
            if (row.id !== lastId) {
                list.innerHTML += `<dt>[${row.id}] ${e(row.nick)}</dt>`;
                if (row.character_id)
                    list.innerHTML += `
                        <dd><a href="https://profile.polo-sero.cz#char${row.character_id}">
                            char${row.character_id}
                        </a></dd>`
                row.mail && (list.innerHTML += `<dd>${row.mail}</dd>`);
            }
            lastId = row.id;
            if (!row.target && !row.level)
                continue;
            const permission_cb = (a) => `setPermission(${e(row.id)}, '${e(row.target)}', ${e(row.level+a)})`;
            list.innerHTML += `<dd>
                <span class="target">${e(row.target)}</span>
                <span class="level">${e(row.level)}</span>
                <button class="lvl-4" onclick="${permission_cb(1)}">+</button>
                <button class="lvl-4" onclick="${permission_cb(-1)}">-</button>
            </dd>`;
        }
    }).catch(error => {
        console.error('users:', error);
    });
}

function setPermission(user_id, permission_type, level) {
    XHR(
        'PUT',
        '/auth/permission',
        { user_id, permission_type, level }
    ).then(response => {
        console.log('set permission:', response);
        loadUsers();
    }).catch(error => {
        console.error('set permission:', error);
    })
}


function loginVisible(visible) {
    document.getElementById('login-form').hidden = !visible;
}

function visibleByPermission(level) {
    level = level || 0;
    console.log('level:', level);
    for (let lvl = 10; lvl > 0; --lvl) {
        const els = document.getElementsByClassName(`lvl-${lvl}`);
        for (let i = 0; i < els.length; ++i)
            els[i].hidden = lvl > level;
    }
}


function displayPermissions(perms) {
    const list = document.getElementById('access');
    list.innerHTML = '';
    if (Object.keys(perms).length === 0 && !ISLOCALHOST)
        return location.replace('https://profile.polo-sero.cz');
    for (const name in perms)
        list.innerHTML += `
            <dt>${name}</dt>
            <dd>${perms[name]}</dd>
            <dd><a href="https://${name}.polo-sero.cz">
                https://${name}.polo-sero.cz
            </a></dd>
        `;
}
