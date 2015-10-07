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
], function(options) {

    var id = '__CoolblueNamespace__';

    return !document.getElementById(id) && function init () {
            var script = '(' + function (
                    debugEnabled,
                    cdnUrl,
                    apiUrl,
                    header,
                    container,
                    list,
                    listItem,
                    pagingHeader,
                    pagingFooter,
                    pages,
                    current,
                    next,
                    prev,
                    itemsPerPage
                ) {

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

                        worker.depaginator.init({
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
                        });
                        worker.send('event', 'depaginator', 'created');
                    });

                } + ')('
                    +options.debugEnabled*1+',"'
                    +options.cdn+'","'
                    +options.api+'","'
                    +options.header+'","'
                    +options.container+'","'
                    +options.list+'","'
                    +options.listItem+'","'
                    +options.pagingHeader+'","'
                    +options.pagingFooter+'","'
                    +options.pages+'","'
                    +options.current+'","'
                    +options.next+'","'
                    +options.prev+'","'
                    +options.itemsPerPage
                +'" );';


            var a = document.createElement('script');
            a.id = id;
            a.textContent = script;
            (document.head || document.documentElement).appendChild(a);
        }();
});
