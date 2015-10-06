function save_options() {
    var debugEnabled = document.getElementById('debugEnabled').checked;
    var cdn = document.getElementById('cdn').value;
    var api = document.getElementById('api').value;
    var header = document.getElementById('header').value;
    var container = document.getElementById('container').value;
    var list = document.getElementById('list').value;
    var listItem = document.getElementById('listItem').value;
    var pagingHeader = document.getElementById('pagingHeader').value;
    var pagingFooter = document.getElementById('pagingFooter').value;
    var pages = document.getElementById('pages').value;
    var current = document.getElementById('current').value;
    var next = document.getElementById('next').value;
    var prev = document.getElementById('prev').value;
    var itemsPerPage = document.getElementById('itemsPerPage').value;
    chrome.storage.sync.set({
        debugEnabled: debugEnabled,
        cdn: cdn,
        api: api,
        header: header,
        container: container,
        list: list,
        listItem: listItem,
        pagingHeader: pagingHeader,
        pagingFooter: pagingFooter,
        pages: pages,
        current: current,
        next: next,
        prev: prev,
        itemsPerPage: itemsPerPage

    }, function() {
        var status = document.getElementById('success');
        status.style.display = 'block';
        setTimeout(function() {
            status.style.display = 'none';
        }, 1500);
    });
}

function restore_options() {
    chrome.storage.sync.get([
        'debugEnabled',
        'cdn',
        'api',
        'header',
        'container',
        'list',
        'listItem',
        'pagingHeader',
        'pagingFooter',
        'pages',
        'current',
        'next',
        'prev',
        'itemsPerPage'
    ], function(items) {
        document.getElementById('debugEnabled').checked = items.debugEnabled;
        document.getElementById('cdn').value = items.cdn;
        document.getElementById('api').value = items.api;
        document.getElementById('header').value = items.header;
        document.getElementById('container').value = items.container;
        document.getElementById('list').value = items.list;
        document.getElementById('listItem').value = items.listItem;
        document.getElementById('pagingHeader').value = items.pagingHeader;
        document.getElementById('pagingFooter').value = items.pagingFooter;
        document.getElementById('pages').value = items.pages;
        document.getElementById('current').value = items.current;
        document.getElementById('next').value = items.next;
        document.getElementById('prev').value = items.prev;
        document.getElementById('itemsPerPage').value = items.itemsPerPage;

        document.getElementById('main-container').style.display = 'block';
    });
}
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);


