function save_options() {
    var cdn = document.getElementById('cdn').value;
    var api = document.getElementById('api').value;
    var debugEnabled = document.getElementById('debugEnabled').checked;
    chrome.storage.sync.set({
        cdn: cdn,
        api: api,
        debugEnabled: debugEnabled
    }, function() {
        var status = document.getElementById('success');
        status.style.display = 'block';
        setTimeout(function() {
            status.style.display = 'none';
        }, 1500);
    });
}

function restore_options() {
    chrome.storage.sync.get(['debugEnabled','cdn','api'], function(items) {
        document.getElementById('cdn').value = items.cdn;
        document.getElementById('api').value = items.api;
        document.getElementById('debugEnabled').checked = items.debugEnabled;

        document.getElementById('main-container').style.display = 'block';
    });
}
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);