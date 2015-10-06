chrome.storage.sync.get(['debugEnabled','cdn','api'], function(options) {

    var wrapper = document.head || document.documentElement,
        className = 'coolblue-worker';

    function init () {
        var script = '(' + function (debugEnabled, cdnUrl, apiUrl) {

                (function(w,d,t,c,s,i,n,a,b,ar){
                    if (!w[n]) {
                        w['__CoolblueNamespace__'] = n;
                        w[n] = function () {
                            w[n].q.push(ar=arguments);
                            return {then:function(c){ar.cb=c}};
                        };
                        w[n].q = [];
                        w[n].t = 1 * new Date();
                        w[n].cdn = c;
                        w[n].api = i;
                        w[n].debug = debugEnabled;

                        a = d.createElement(t);
                        b = d.getElementsByTagName(t)[0];
                        a.async = 1;
                        a.src = c+s;
                        b.parentNode.insertBefore(a,b);
                    }
                })(window,document,'script',cdnUrl,'coolblue.js',apiUrl,'_coolblue');


                _coolblue('create', '1', 'myFirstWorker');

                _coolblue('wait', 'depaginator').then(function (worker) {
                    // TODO: move to plugin options
                    worker.depaginator.init({
                        header: '.coolblue-bar.sticky-header--bar',
                        container: '#facet_productlist',
                        list: '.product-list-columns',
                        listItem: '.product-list-columns .product-list-item',
                        pagingHeader: '.paging-header',
                        pagingFooter: '.paging-footer',
                        pages: '.paging-navigation-pages>li>a',
                        current: '.paging-navigation-pages>li.paging-navigation-current-page',
                        next: '.paging-navigation .pagination.next',
                        prev: '.paging-navigation .pagination.previous',
                        itemsPerPage: '.paging-shown-per-page'
                    });
                    worker.send('event', 'depaginator', 'created');
                });

            } + ')('+options.debugEnabled*1+',"'+options.cdn+'","'+options.api+'");';


        var a = document.createElement('script');
        a.className = className;
        a.textContent = script;
        wrapper.appendChild(a);
    }

    // TODO: implement better check
    if (!wrapper.getElementsByClassName(className).length) {
        init();
    }

});
