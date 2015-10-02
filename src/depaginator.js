(function (d, w, namespace, noop, u) {
    "use strict";

    var $ = w.jQuery,
        $w = $(w),
        client = w[namespace],
        util = client.exports.util,
        classes = client.exports.classes;

    /**
     * @class DataModel
     * @extends classes.Abstract
     */
    var DataModel = classes.Abstract.extend({
        /**
         * @type {!Object}
         */
        attributes: {},

        /**
         * @constructor
         * @param {!Object} data
         */
        constructor: function (data) {
            var m = this;
            this.data = {};
            $.each(this.attributes, function (key, value) {
                m.data[key] = data[key] !== undefined ? data[key] : value;
            });
            classes.Abstract.apply(this, arguments);
        },

        /**
         * @param {string} key
         * @param {*} value
         */
        set: function (key, value) {
            this.data[key] = value;
        },

        /**
         * @param {string} key
         * @return {*}
         */
        get: function (key) {
            return this.data[key];
        }
    });

    /**
     * @class DepaginatorSelectors
     * @extends DataModel
     */
    var DepaginatorSelectors = DataModel.extend({
        attributes: {
            header: '',
            container: '',
            list: ''
        }
    });

    /**
     * @class PagingSelectors
     * @extends DataModel
     */
    var PagingSelectors = DataModel.extend({
        attributes: {
            pagingHeader: '',
            pagingFooter: '',
            pages: '',
            current: '',
            next: '',
            itemsPerPage: '',
            listItem: ''
        }
    });

    /**
     * @class PageModel
     * @extends DataModel
     */
    var PageModel = DataModel.extend({
        attributes: {
            number: 0,
            url: u,
            dom: null
        }
    });

    /**
     * @class ViewPortObserver
     * @param {jQuery} $frame
     * @constructor
     */
    function ViewPortObserver ($frame) {
        this.$frame = $frame;
        this.rect = null;
        this.handler = {
            scroll: $.proxy(this.onScroll, this),
            resize: $.proxy(this.onResize, this)
        };
        this.onThresholdReached = noop;
        this.onFrameScrolled = noop;
        this.onResized = noop;
    }

    ViewPortObserver.prototype = {

        turnOn: function (onThresholdReached, onFrameScrolled, onResized) {
            if (this.isOn()) {
                this.turnOff();
            }
            client.cursor.request(this.handler);
            this.onThresholdReached = onThresholdReached || noop;
            this.onFrameScrolled = onFrameScrolled || noop;
            this.onResized = onResized || noop;
            return this;
        },

        turnOff: function () {
            if (client.cursor.release(this.handler)) {
                this.onThresholdReached = noop;
                this.onFrameScrolled = noop;
                this.onResized = noop;
            }
            return this;
        },

        isOn: function () {
            return !!client.cursor.findRequester(this.handler);
        },

        onScroll: function (data) {
            this.observe(data);
            this.onFrameScrolled(this.rect.top);
        },

        onResize: function (data) {
            this.observe(data);
            this.onResized();
        },

        observe: function (data) {
            this.rect = this.$frame[0].getBoundingClientRect();
            if (this.rect.bottom < data.vpH * 1.5) {
                this.onThresholdReached();
            }
        },

        trigger: function () {
            $.each(this.handler, function (key) {
                $w.trigger(key);
            });
            return this;
        }

    };

    /**
     * @class Paging
     * @param {!jQuery} $context
     * @param {!Object} selectors
     * @constructor
     */
    function Paging ($context, selectors) {
        this.$context = $context;
        this.selectors = new PagingSelectors(selectors);
        this.reset();
    }

    /**
     * @enum Paging.POSITION
     */
    Paging.POSITION = {
        FIXED: 'fixed',
        STATIC: 'static'
    };

    Paging.prototype = {

        getContainer: function ($context) {
            return ($context || this.$context).find(this.selectors.get('pagingHeader')).first();
        },

        adjustDimensions: function (offsetTop) {
            this.getContainer().css({
                float: 'left',
                width: this.$context.width(),
                top: offsetTop
            });
        },

        bindEvents: function () {
            this.getContainer().find(this.selectors.get('pages')).on('click', $.proxy(this.onPageNumberClicked, this));
        },

        reposition: function (position) {
            if (this.position !== position) {
                var container = this.getContainer();
                switch (position) {
                    case Paging.POSITION.FIXED:
                        this.$context.css({
                            'padding-top': container.height()
                        });
                        break;
                    case Paging.POSITION.STATIC:
                        this.$context.css({
                            'padding-top': 0
                        });
                        break;
                    default:
                        return;
                }
                container.css('position', position);
                this.position = position;
            }
        },

        updateCurrentPage: function (scrollTop) {
            var initialPage;

            if (this._pages.length) {
                initialPage = this._pages[0];
            }

            console.log(scrollTop);

            //this.getContainer().empty().append(
            //    next.get('dom').children()
            //);
            //w.history.pushState(null, null, next.get('url'));
            //this.bindEvents(); // TODO check events are not duplicated
        },

        reset: function () {
            var container = this.getContainer(),
                $itemsPerPageSelect = this.$context.find(this.selectors.get('itemsPerPage'));
            container.css({
                'z-index': 5,
                'background-color': '#fff'
            });

            this.$context.find(this.selectors.get('pagingFooter')).remove();

            this.position = u;

            this._pages = [];
            this._current = 0;
            this._itemsPerPage = parseInt($itemsPerPageSelect.val());
            this._totalItems = parseInt($itemsPerPageSelect.children().last().val());

            this.bindEvents();

            return this;
        },

        /**
         * @returns {Boolean}
         */
        hasNext: function () {
            return !!this._pages[this._current+1];
        },

        /**
         * @returns {Object}
         */
        next: function () {
            return this._pages[++this._current];
        },

        onPageNumberClicked: function (e) {
            var n = e.target.innerHTML * 1;
            if (this.getPage(n) !== null) {
                this.scrollToPage(n);
                return false;
            } else {
                if (this.position === Paging.POSITION.FIXED) {
                    this.scrollToPage(0);
                }
            }
        },

        /**
         * @param {!Number} n
         * @returns {Promise}
         */
        scrollToPage: function (n) {
            var scrollTop = n ?
                function (that) {
                    var initialPage = that._pages.length ? that._pages[0] : null;
                    if (initialPage) {
                        return that.$context.find(that.selectors.get('listItem'))
                            .eq((n - initialPage.get('number')) * that._itemsPerPage)
                            .offset().top - that.getContainer().height();
                    }
                    return 0;
                }(this) :
                this.$context.offset().top;

            return $('html, body').animate({
                scrollTop: scrollTop - parseInt(this.getContainer().css('top'))
            }, 100).promise();
        },

        collectPagingData: function () {
            var currentNumber = this.$context.find(this.selectors.get('current')).text() * 1,
                next = this.$context.find(this.selectors.get('next'));
            var currentPageModel = this.getPage(currentNumber);
            if (!currentPageModel) {
                currentPageModel = new PageModel({
                    number: currentNumber,
                    url: w.location.toString()
                });
                this._pages.push(currentPageModel);
            }
            if (next.length) {
                this._pages.push(new PageModel({
                    number: currentNumber + 1,
                    url: next[0].href
                }));
            }
            currentPageModel.set('dom', this.getContainer());
        },

        /**
         * @param {Number} pageNumber
         * @returns {?PageModel}
         */
        getPage: function (pageNumber) {
            return $.grep(this._pages, function (page) {
                return page.get('number') === pageNumber;
            })[0] || null;
        }
    };

    /**
     * @class Depaginator
     * @param {!Worker} worker
     * @constructor
     */
    function Depaginator (worker) {
        this.worker = worker;
        this.selectors = u;
        this.vpObserver = u;
        this.paging = u;
        this.isLoading = false;
        this.loader = u;
        this.$header = u;
        this.$container = u;
        this.offsetTop = 0;
        this.bindLazyLoadingImages = noop;

        util.logV('constructed Depaginator:', this.worker.get('id'));
    }

    Depaginator.prototype = {

        init: function (selectors) {
            this.selectors = new DepaginatorSelectors(selectors);

            this.$header = $(this.selectors.get('header'));
            this.$container = $(this.selectors.get('container'));

            this.updateOffsets();
            this.paging = new Paging(this.$container, selectors);

            this.overrideNative();

            if (this.paging.getContainer().length) {
                this.vpObserver = new ViewPortObserver(this.$container);
                this.vpObserver.turnOn(
                    $.proxy(this.onRequestNextPage, this),
                    $.proxy(this.onContainerScrolled, this),
                    $.proxy(this.onViewportResized, this)
                ).trigger();
            }

            return this;
        },

        overrideNative: function () {
            var that = this;
            this.bindLazyLoadingImages = w.bindLazyLoadingImages || noop;
            w.bindLazyLoadingImages = function () {
                that.onAfterPageReloaded();
                return that.bindLazyLoadingImages();
            };
        },

        updateOffsets: function () {
            this.offsetTop = this.$header.height();
        },

        onContainerScrolled: function (top) {
            this.paging.reposition(top - this.offsetTop <= 0 ? Paging.POSITION.FIXED : Paging.POSITION.STATIC);
            this.paging.updateCurrentPage(top);
        },

        onViewportResized: function () {
            this.updateOffsets();
            this.paging.adjustDimensions(this.offsetTop);
        },

        onRequestNextPage: function () {

            var dep = this,
                listSelector = this.selectors.get('list'),
                next;

            if (this.isLoading) {
                return;
            }

            this.paging.collectPagingData();

            if (this.paging.hasNext()) {

                this.isLoading = true;

                next = this.paging.next();

                dep.loader = new classes.DfdLite();

                $.get(next.get('url')).then(
                    $.proxy(dep.loader.resolve, dep.loader),
                    $.proxy(dep.loader.reject, dep.loader)
                );

                dep.loader.promise()
                    .done(function (response) {
                        var $r = $(response);

                        dep.$container.find(listSelector).append(
                            $r.find(listSelector).children()
                        );

                        next.set('dom', dep.paging.getContainer($r));

                        dep.bindLazyLoadingImages();

                        dep.vpObserver.trigger();
                    })
                    .always(function () {
                        dep.isLoading = false;
                    });
            }

        },
        onAfterPageReloaded: function () {
            if (this.loader) {
                this.loader.reject();
                this.loader = u;
            }
            this.paging.reset();
            this.vpObserver.trigger();
        }
    };

    return (client.Depaginator = Depaginator);

})(document, window, window.__CoolblueNamespace__, function(){});
