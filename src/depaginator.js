(function (d, w, namespace, noop, u) {
    "use strict";

    var $ = w.jQuery,
        $w = $(w),
        $d = $(d),
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
            prev: '',
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
            paging: null,
            nextUrl: u
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
        this.offsetTop = 0;
        this.isBusy = false;
        this._pages = [];
        this._onResetCb = [];
        this.init();
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
            var container = this.getContainer().css({
                float: 'left',
                width: this.$context.width(),
                top: offsetTop
            });
            this.offsetTop = offsetTop;
            this.height = container.height();
        },

        bindEvents: function () {
            this.getContainer().find(this.selectors.get('pages')).on('click', $.proxy(this.onPageNumberClicked, this));
            this.getContainer().find(this.selectors.get('next')).on('click', $.proxy(this.onPageNextClicked, this));
            this.getContainer().find(this.selectors.get('prev')).on('click', $.proxy(this.onPagePrevClicked, this));
        },

        reposition: function (position) {
            if (this.position !== position) {
                var container = this.getContainer();
                switch (position) {
                    case Paging.POSITION.FIXED:
                        this.$context.css({
                            'padding-top': this.height
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

        updateCurrentPage: function (top) {
            var that = this,
                offsetTop,
                initialPageNumber,
                lastScrolledPageNumber = 0,
                initialPage, currentPage;

            if (!this.isBusy && this._pages.length) {
                initialPage = this._pages[0];

                if($w.scrollTop() + $w.height() === $d.height()) {
                    lastScrolledPageNumber = this.getLast().get('number');
                } else {
                    initialPageNumber = initialPage.get('number');
                    this.$context.find(this.selectors.get('listItem')).each(function(index, el) {
                        if (index && index % that._itemsPerPage === 0) {
                            offsetTop = Math.round(el.getBoundingClientRect().top);
                            if (offsetTop <= (that.height + that.offsetTop)) {
                                lastScrolledPageNumber = initialPageNumber + index / that._itemsPerPage;
                            } else {
                                return false;
                            }
                        }
                    });
                }

                currentPage = lastScrolledPageNumber ? this.getPage(lastScrolledPageNumber) : initialPage;

                if (this._currentPage !== currentPage) {
                    this.getContainer().empty().append(
                        currentPage.get('paging').children().clone()
                    );
                    (w.history.pushState || noop).call(w.history, null, null, currentPage.get('url'));
                    this.bindEvents();
                    this._currentPage = currentPage;
                }
            }
        },

        toggleLoader: function (v) {
            this.$loader.css('visibility', v ? 'visible' : 'hidden');
        },

        /**
         * Init paging
         * @returns {Paging}
         */
        init: function () {
            var container = this.getContainer(),
                $itemsPerPageSelect = this.$context.find(this.selectors.get('itemsPerPage'));

            container.css({
                'z-index': 2,
                'background-color': '#fff'
            });

            this.$loader = this.$context.find(this.selectors.get('pagingFooter'))
                .empty()
                .addClass('facet_loader_spinner_animation spinner-animation')
                .css({
                    position: 'relative',
                    visibility: 'hidden'
                }).show();

            this.position = u;
            this.height = container.height();

            this._itemsPerPage = parseInt($itemsPerPageSelect.val());
            this._totalItems = parseInt($itemsPerPageSelect.children().last().val());

            this.reset();
            this.collect(this.$context);
            this.get().set('url', w.location.toString());

            this.bindEvents();

            return this;
        },

        /**
         * Reset enumerable
         * @returns {Paging}
         */
        reset: function () {
            this._pages.length = 0;
            this._currentPage = null;
            this._index = 0;
            $.each(this._onResetCb, function (i, cb) {
                cb();
            });
            return this;
        },

        subscribeOnReset: function (callback) {
            this._onResetCb.push(callback);
        },

        /**
         * @returns {?PageModel}
         */
        get: function () {
            return this._pages[this._index];
        },

        /**
         * @returns {?PageModel}
         */
        getLast: function () {
            return this._pages[this._pages.length - 1];
        },

        /**
         * @returns {Boolean}
         */
        hasNext: function () {
            var current = this.get();
            return current && current.get('nextUrl');
        },

        /**
         * @returns {?PageModel}
         */
        next: function () {
            return this._pages[++this._index];
        },

        /**
         * Collect page data
         * @param {!jQuery} $context
         * @returns {!PageModel}
         */
        collect: function ($context) {
            var next = $context.find(this.selectors.get('next'));
            var model = new PageModel({
                number: $context.find(this.selectors.get('current')).first().text() * 1,
                paging: this.getContainer($context).clone()
            });
            if (next.length) {
                model.set('nextUrl', next[0].href);
            }
            this._pages.push(model);
            return model;
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
                                .offset().top - that.height;
                    }
                    return 0;
                }(this) :
                this.$context.offset().top;

            return $('html, body').animate({
                scrollTop: scrollTop - this.offsetTop
            }, 100).promise();
        },

        /**
         * @param {Number} pageNumber
         * @returns {?PageModel}
         */
        getPage: function (pageNumber) {
            return $.grep(this._pages, function (page) {
                    return page.get('number') === pageNumber;
                })[0] || null;
        },

        /**
         * @param {Number} n
         * @returns {boolean}
         */
        onPageRequested: function (n) {
            var that = this;

            if (this.isBusy) {
                return false;
            }

            this.isBusy = true;

            if (this.getPage(n) !== null) {
                this.scrollToPage(n).then(function () {
                    that.isBusy = false;
                    this.trigger('scroll');
                    return this;
                });
                return true;
            } else {
                if (this.position === Paging.POSITION.FIXED) {
                    this.scrollToPage(0).then(function () {
                        that.reset();
                        that.isBusy = false;
                        this.trigger('scroll');
                    });
                } else {
                    this.isBusy = false;
                }
            }
            return false;
        },

        /**
         * @callback
         * @param {Event} e
         * @returns {boolean}
         */
        onPageNumberClicked: function (e) {
            return !this.onPageRequested(e.target.innerHTML * 1);
        },

        /**
         * @callback
         * @param {Event} e
         * @returns {boolean}
         */
        onPageNextClicked: function (e) {
            return !this.onPageRequested(this._currentPage ? this._currentPage.get('number') + 1 : -1);
        },

        /**
         * @callback
         * @param {Event} e
         * @returns {boolean}
         */
        onPagePrevClicked: function (e) {
            return !this.onPageRequested(this._currentPage ? this._currentPage.get('number') - 1 : -1);
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
            this.paging.subscribeOnReset($.proxy(this.abort, this));

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

        abort: function () {
            if (this.loader) {
                this.loader.reject();
                this.loader = u;
            }
        },

        overrideNative: function () {
            var that = this;
            this.bindLazyLoadingImages = w.bindLazyLoadingImages || noop;
            w.bindLazyLoadingImages = function () {
                that.onAfterPageReloaded();
                return that.bindLazyLoadingImages();
            };
        },

        reinitComparisonBar: function () {
            try {
                $($.comparison.bar.defaultOptions.comparisonElementSelector + ' input.checkbox').off('click');
                $d.off('click.comparisonbar');
                $.comparison.bar();
                $.comparison.collapse.activate();
            } catch (e) {}
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
            var that = this,
                listSelector = this.selectors.get('list'),
                pageModel = this.paging.get();

            if (this.isLoading) {
                return;
            }

            if (this.paging.hasNext()) {

                this.isLoading = true;
                this.paging.toggleLoader(true);

                this.loader = new classes.DfdLite();

                $.get(pageModel.get('nextUrl')).then(
                    $.proxy(that.loader.resolve, that.loader),
                    $.proxy(that.loader.reject, that.loader)
                );

                this.loader.promise()
                    .done(function (response) {
                        var $r = $(response);

                        that.$container.find(listSelector).append(
                            $r.find(listSelector).children()
                        );

                        that.paging.collect($r);
                        that.paging.next();
                        that.paging.get().set('url', pageModel.get('nextUrl'));

                        that.bindLazyLoadingImages();
                        util.async(that.reinitComparisonBar, that);
                    })
                    .always(function () {
                        that.isLoading = false;
                        that.paging.toggleLoader(false);
                        that.vpObserver.trigger();
                    });
            }

        },
        onAfterPageReloaded: function () {
            this.paging.init();
            this.vpObserver.trigger();
        }
    };

    return (client.Depaginator = Depaginator);

})(document, window, window.__CoolblueNamespace__, function(){});
