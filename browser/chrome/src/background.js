function parseUrl (url) {
    var l = document.createElement("a");
    l.href = url;
    return l;
}

function runDepaginator (tabId) {
    chrome.tabs.executeScript(tabId, {
        file: "depaginator.js",
        runAt: "document_end"
    }, function () {
        if(chrome.runtime.lastError) {
            chrome.browserAction.setIcon({
                path: "off_icon_24.png",
                tabId: tabId
            });
        } else {
            chrome.browserAction.setIcon({
                path: "on_icon_24.png",
                tabId: tabId
            });
        }
    });
}

chrome.browserAction.onClicked.addListener(function(tab) {
    var url = parseUrl(tab.url),
        baseUrl = url.protocol + '//' + url.host + '/';

    chrome.permissions.contains({
        origins: [baseUrl]
    }, function(result) {
        if (result) {
            chrome.permissions.remove({
                origins: [baseUrl]
            }, function(removed) {
                removed && chrome.tabs.reload(tab.id);
            });
        } else {
            chrome.permissions.request({
                origins: [baseUrl]
            }, function(granted) {
                granted && runDepaginator(tab.id);
            });
        }
    });
});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete') {
        runDepaginator(tabId);
    }
});

chrome.runtime.onInstalled.addListener(function (details) {
    if(details.reason == "install"){
        chrome.storage.sync.set({
            cdn: '//localhost:63342/cool-blue-depaginator/src/',
            api: '/winkelmandje/',
            debugEnabled: 1
        });
    }
});



