(function (d, w, namespace, noop, u) {
    "use strict";

    /**
     * @type {?jQuery}
     */
    var $ = w.jQuery,

        /**
         * @type {ClientStorage}
         */
        clientStorage,

        /**
         * @type {Location}
         */
        loc = w.location,

        /**
         * @type {Object}
         */
        params = w[namespace],

        modulePromise = {},

        Collector;

    /* utils */
    var slice = Array.prototype.slice,
        hasOwn = Object.prototype.hasOwnProperty,

        /**
         * @param {*} o
         * @returns {boolean}
         */
        isObj = function (o) {
            return o !== null && typeof o === 'object';
        },

        /**
         * @param {*} f
         * @returns {boolean}
         */
        isFunc = function (f) {
            return typeof f === 'function';
        },

        /**
         * @param {*} o
         * @returns {boolean}
         */
        isPromise = function (o) {
            return isObj(o) && isFunc(o.promise) && !DfdLite.isThis(o);
        },

        /**
         * @param {Function} cb
         * @param {Object=} context
         * @param {Array=} args
         */
        async = function (cb, context, args) {
            setTimeout(function () {
                cb.apply(context, args);
            }, 0);
        },

        /**
         *
         * @param {Function} constructor
         * @param {Array=} args
         * @returns {Object}
         */
        createObj = function (constructor, args) {
            var O = function () {};
            O.prototype = constructor.prototype;
            O.prototype.constructor = constructor;
            var o = new O();
            constructor.apply(o, args);
            return o;
        },

        /**
         * @param {number} fps
         * @param {!Function} callback
         * @param {Object=} context
         * @returns {Function}
         */
        framed = function (fps, callback, context) {
            var timeoutId, lastCalled = 0, delay;
            t.setFPS = function (n) {
                delay = 1000/n;
            };
            t.setFPS(fps);
            function t() {
                var elapsed = new Date() - lastCalled,
                    args = arguments;
                timeoutId && clearTimeout( timeoutId );
                return ( elapsed > delay ) ? call() : (timeoutId = setTimeout(call, delay - elapsed));
                function call() {
                    lastCalled = new Date() * 1;
                    callback.apply(context, args);
                }
            }
            return t;
        },

        /**
         * @param {!Function} func
         * @param {number} wait
         * @param {boolean=} immediate
         * @returns {Function}
         */
        debounce = function (func, wait, immediate) {
            var timeout;
            return function() {
                var context = this, args = arguments;
                var later = function() {
                    timeout = null;
                    !immediate && func.apply(context, args);
                };
                var callNow = immediate && !timeout;
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
                callNow && func.apply(context, args);
            };
        },

        /**
         * @function uniqueCID
         * @returns {number}
         */
        uniqueCID = function () {
            var i = 0;
            return function () {
                return i++;
            };
        }();

    /**
     * @enum MODULE
     */
    var MODULE = {
        JSON: 'json2',
        JQUERY: 'jquery',
        DEPAGINATOR: 'depaginator'
    };

    /**
     * @enum KEY
     */
    var KEY = {
        CLIENT: '_COOL_BLUE_CID'
    };

    /**
     * @interface ClientStorage
     * @method getItem (k)
     * @method setItem (k, v)
     * @method removeItem (k)
     */

    /**
     * @instance docCookies
     * @implements {ClientStorage}
     */
    var docCookies = {

        getItem: function (sKey) {
            if (!sKey) { return null; }
            return decodeURIComponent(d.cookie.replace(new RegExp("(?:(?:^|.*;)\\s*" + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$"), "$1")) || null;
        },

        setItem: function (sKey, sValue, vEnd, sPath, sDomain, bSecure) {
            if (!sKey || /^(?:expires|max\-age|path|domain|secure)$/i.test(sKey)) { return; }
            var sExpires = "";
            if (vEnd) {
                switch (vEnd.constructor) {
                    case Number:
                        sExpires = vEnd === Infinity ? "; expires=Fri, 31 Dec 9999 23:59:59 GMT" : "; max-age=" + vEnd;
                        break;
                    case String:
                        sExpires = "; expires=" + vEnd;
                        break;
                    case Date:
                        sExpires = "; expires=" + vEnd.toUTCString();
                        break;
                }
            }
            d.cookie = encodeURIComponent(sKey) + "=" + encodeURIComponent(sValue) + sExpires + (sDomain ? "; domain=" + sDomain : "") + "; path=" + (sPath || "/") + (bSecure ? "; secure" : "");
        },

        removeItem: function (sKey, sPath, sDomain) {
            if (!this._hasItem(sKey)) { return; }
            d.cookie = encodeURIComponent(sKey) + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT" + (sDomain ? "; domain=" + sDomain : "") + (sPath ? "; path=" + sPath : "");
        },

        _hasItem: function (sKey) {
            if (!sKey) { return false; }
            return (new RegExp("(?:^|;\\s*)" + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=")).test(d.cookie);
        }
    };

    var _log = function (type) {
            w.console && w.console[type] && function (c, args) {
                var data = [namespace, '['+(new Date() - params.t)/1000 + 's]'];
                data.push.apply(data, args);
                c[type].apply(c, data);
            }(w.console, slice.call(arguments, 1)[0]);
        },
        logE = function (/* args.. */) {
            _log('error', arguments);
        },
        logV = function (/* args.. */) {
            params.debug && _log('log', arguments);
        };

    /**
     * @param {string} name - module name with optional id param eg. `wizard:12345`
     * @return {undefined|Promise}
     */
    var loadModule = function (name) {
        var p = name.split(':');
        return (modulePromise[name] = (function () {
            switch (p[0]) {
                case MODULE.JQUERY:
                    return loadScript(params.cdn+'lib/jquery-1.11.3.min.js', function () {
                        return w.jQuery;
                    });
                case MODULE.JSON:
                    return loadScript(params.cdn+'polyfill/json2.min.js', function () {
                        return w.JSON;
                    });
                case MODULE.DEPAGINATOR:
                    return loadScript(params.cdn+'depaginator.js');
            }
        })());
    };

    /**
     * @return {Promise}
     */
    var waitModules = function (/* args.. */) {
        var promises = [], i = 0, mName;

        for (; i < arguments.length;) {
            mName = arguments[i++];
            promises.push(modulePromise[mName] || loadModule(mName));
        }

        return DfdLite.all(promises);
    };

    /**
     * @param {string} url
     * @param {Function=} onLoad
     * @return {Promise}
     */
    var loadScript = function (url, onLoad) {
        var o = d.createElement('script'),
            h = d.getElementsByTagName('head')[0],
            done = 0,
            def = new DfdLite();
        o.async = 1;
        o.src = url;
        o.onload = o.onreadystatechange = function () {
            if (!done && (!this.readyState || this.readyState === 'loaded' || this.readyState === 'complete')) {
                done = true;
                def.resolve(onLoad && onLoad());
                o.onload = o.onreadystatechange = null;
                h.removeChild(o);
            }
        };
        h.appendChild(o);
        return DfdLite.when(def);
    };

    /**
     * @class Abstract
     * @constructor
     */
    function Abstract() {
        this.init.apply(this, arguments);
    }

    /**
     * @method [init] - pseudo constructor
     */
    Abstract.prototype.init = function () {};

    /**
     * @static
     * @param {?Object} protoProps
     * @param {?Object} staticProps
     * @returns {function}
     */
    Abstract.extend = function (protoProps, staticProps) {
        var P = this, C;

        if (protoProps && hasOwn.call(protoProps, 'constructor')) {
            C = protoProps.constructor;
        } else {
            C = function () {
                return P.apply(this, arguments);
            };
        }

        $.extend(C, P, staticProps);

        var Proto = function () {
            this.constructor = C;
        };
        Proto.prototype = P.prototype;
        C.prototype = new Proto();

        protoProps && $.extend(C.prototype, protoProps);

        C._super = P.prototype;

        return C;
    };

    /**
     * Resource
     * @param {String} collection
     * @param {String} baseUrl (optional)
     * @constructor
     */
    function Resource (collection, baseUrl) {
        this._baseUrl = baseUrl || Resource.baseUrl;
        this._collection = collection;
        this._path = '';
    }

    /**
     * @static {string} baseUrl
     */
    Resource.baseUrl = params.api;

    /**
     * @enum Resource.METHOD
     */
    Resource.METHOD = {
        GET: 'GET',
        POST: 'POST',
        PUT: 'PUT',
        DELETE: 'DELETE'
    };

    Resource.prototype = {

        /**
         * @param {string} collectionOrId
         * @param {string=} itemId
         * @returns {Resource}
         */
        one: function (collectionOrId, itemId) {
            this._path += '/' + collectionOrId + (itemId ? '/' + itemId : '');
            return this;
        },

        /**
         * @param {string} collection
         * @returns {Resource}
         */
        all: function (collection) {
            this._path += '/' + collection;
            return this;
        },

        /**
         * @param {Object=} queryParams
         * @param {Object=} params
         * @returns {Promise}
         */
        getAll: function (queryParams, params) {
            return this.send(Resource.METHOD.GET, u, u, queryParams, params);
        },

        /**
         * @param {string|number} id
         * @param {Object=} queryParams
         * @param {Object=} params
         * @returns {Promise}
         */
        get: function (id, queryParams, params) {
            return this.send(Resource.METHOD.GET, id, u, queryParams, params);
        },

        /**
         * @param {string|number} id
         * @param {!Object} data
         * @param {Object=} queryParams
         * @param {Object=} params
         * @returns {Promise}
         */
        update: function (id, data, queryParams, params) {
            return this.send(Resource.METHOD.PUT, id, data, queryParams, params);
        },

        /**
         * @param {!Object} data
         * @param {Object=} queryParams
         * @param {Object=} params
         * @returns {Promise}
         */
        create: function (data, queryParams, params) {
            return this.send(Resource.METHOD.POST, u, data, queryParams, params);
        },

        /**
         * @param {string|number} id
         * @param {Object=} queryParams
         * @param {Object=} params
         * @returns {Promise}
         */
        remove: function (id, queryParams, params) {
            return this.send(Resource.METHOD.DELETE, id, u, queryParams, params);
        },

        /**
         * @param {Resource.METHOD} method
         * @param {string|number} id
         * @param {!Object} data
         * @param {Object=} queryParams
         * @param {Object=} params
         * @returns {Promise}
         */
        send: function (method, id, data, queryParams, params) {
            var url = this._baseUrl + this._collection + this._path;
            id && (url += '/' + id);
            queryParams && (url += '?' + $.param(queryParams));
            this._path = '';
            return $.ajax($.extend({
                url: url,
                method: method,
                type: method,
                data: w.JSON.stringify(data),
                contentType: 'application/json'
            }, params));
        }
    };

    /**
     * @class DfdLite
     * @constructor
     */
    function DfdLite () {
        this._state = DfdLite.STATE.PENDING;
        this._data = u;
        this._onResolvedCbs = [];
        this._onRejectedCbs = [];
        this._onFinallyCbs = [];
    }

    /**
     * @enum DfdLite.STATE
     */
    DfdLite.STATE = {
        PENDING: 'pending',
        RESOLVED: 'resolved',
        REJECTED: 'rejected'
    };

    /**
     * @param {?Object} d
     * @returns {boolean}
     */
    DfdLite.isThis = function (d) {
        return d instanceof DfdLite;
    };

    /**
     * @typedef {Object} Promise
     * @property {function} progress
     * @property {function} promise
     * @property {function} state
     * @property {function} done
     * @property {function} fail
     * @property {function} always
     */

    /**
     * @param {*} result
     * @returns {Promise}
     */
    DfdLite.when = function (result) {
        if (isPromise(result)) {
            return result;
        }
        var dfd = DfdLite.isThis(result) ? result : new DfdLite().resolve(result);

        return {

            progress: noop,

            /**
             * @returns {Promise}
             */
            promise: function () {
                return this;
            },

            /**
             * @returns {DfdLite.STATE}
             */
            state: function () {
                return dfd._state;
            },

            /**
             * @param {function(data)} cb
             * @returns {Promise}
             */
            done: function (cb) {
                dfd._onResolvedCbs.push(cb);
                dfd._state === DfdLite.STATE.RESOLVED && dfd._onResolved();
                return this;
            },

            /**
             * @param {function(reason)} cb
             * @returns {Promise}
             */
            fail: function (cb) {
                dfd._onRejectedCbs.push(cb);
                dfd._state === DfdLite.STATE.REJECTED && dfd._onRejected();
                return this;
            },

            /**
             * @param {function} cb
             * @returns {Promise}
             */
            always: function (cb) {
                dfd._onFinallyCbs.push(cb);
                dfd._state !== DfdLite.STATE.PENDING && dfd._onAlways();
                return this;
            }
        };
    };

    /**
     * @param {!Array} dfrds
     * @returns {boolean}
     */
    DfdLite.checkAllResolved = function (dfrds) {
        for (var i = 0, d; i < dfrds.length;) {
            d = dfrds[i++];
            if ((isPromise(d) || DfdLite.isThis(d)) && d.state() !== DfdLite.STATE.RESOLVED) {
                return false;
            }
        }
        return true;
    };

    /**
     * @param {!Array} dfrds
     * @returns {Array}
     */
    DfdLite.getValuesRef = function (dfrds) {
        var values = [], i = 0;
        var process = function (index) {
            var d = dfrds[index];
            if (isPromise(d) || DfdLite.isThis(d)) {
                d.done(function (value) {
                    values[index] = value;
                });
                d.fail(function (value) {
                    values[index] = value;
                });
            } else {
                values[index] = d;
            }
        };
        for (; i < dfrds.length;) {
            process(i++);
        }
        return values;
    };

    /**
     * @param {!Array} dfrds
     * @returns {Promise}
     */
    DfdLite.all = function (dfrds) {
        var master = new DfdLite(), i = 0, values = this.getValuesRef(dfrds);
        var onFail = function () {
            master.state() === DfdLite.STATE.PENDING && master.reject(values);
        };
        var onDone = function () {
            master.state() === DfdLite.STATE.PENDING && DfdLite.checkAllResolved(dfrds) && master.resolve(values);
        };

        DfdLite.checkAllResolved(dfrds) && master.resolve(values);

        for (;i < dfrds.length;) {
            DfdLite.when(dfrds[i++])
                .fail(onFail)
                .done(onDone);
        }

        return DfdLite.when(master);
    };

    DfdLite.prototype = {

        /**
         * @returns {Promise}
         */
        promise: function () {
            return DfdLite.when(this);
        },

        /**
         * @returns {DfdLite.STATE}
         */
        state: function () {
            return this._state;
        },

        /**
         * @param {*} value
         * @returns {DfdLite}
         */
        resolve: function (value) {
            this._state = DfdLite.STATE.RESOLVED;
            this._data = value;
            this._onResolved();
            return this;
        },

        /**
         * @param {*} reason
         * @returns {DfdLite}
         */
        reject: function (reason) {
            this._state = DfdLite.STATE.REJECTED;
            this._data = reason;
            this._onRejected();
            return this;
        },

        _onResolved: function () {
            this._executeCallbacks(this._onResolvedCbs, this._data);
            this._onAlways();
        },

        _onRejected: function () {
            this._executeCallbacks(this._onRejectedCbs, this._data);
            this._onAlways();
        },

        _onAlways: function () {
            this._executeCallbacks(this._onFinallyCbs);
            this._onResolvedCbs.length = 0;
            this._onRejectedCbs.length = 0;
            this._onFinallyCbs.length = 0;
        },

        _executeCallbacks: function (cbs, arg) {
            for (var i = 0,l = cbs.length; i < l; i++) {
                cbs[i].call(this, arg);
            }
        }
    };

    function bootstrap () {
        /**
         * @type {Ctrl} ctrl
         */
        var ctrl,

            /**
             * @type {jQuery} $w
             */
            $w = $(w),

            /**
             * @type {jQuery} $d
             */
            $d = $(d);

        /**
         * @class Collector
         * @extends Abstract
         * @abstract
         */
        Collector = Abstract.extend({

            /**
             * @constructor
             * @param {!Worker} worker
             */
            constructor: function (worker) {
                if (!(worker instanceof Worker)) {
                    throw new Error('The first argument should be an instance of Worker');
                }
                this.worker = worker;
                Abstract.apply(this, arguments);
            },

            /**
             * @property {Array.<string>}
             */
            hitTypes: [],

            /**
             * @returns {Collector}
             */
            collect: function () {
                return this;
            },

            /**
             * @returns {Object}
             */
            serialize: function () {
                return {};
            }
        });


        /**
         * @class CursorTracker
         * @constructor
         */
        function CursorTracker () {
            this.requesters = [];
            this.isListening = false;

            this.data = {
                scrollX: 0,
                scrollY: 0,
                pageX: 0,
                pageY: 0,
                vpW: 0,
                vpH: 0,
                target: null
            };

            this.onScroll = framed(CursorTracker.minFPS, this.onScroll, this);
            this.onResize = framed(CursorTracker.minFPS, this.onResize, this);
            this.onMouseMove = framed(CursorTracker.minFPS, this.onMouseMove, this);
            this.onMouseDown = framed(CursorTracker.minFPS, this.onMouseDown, this);
            this.onClick = framed(CursorTracker.minFPS, this.onClick, this);
        }

        /**
         * @static {number}
         */
        CursorTracker.minFPS = 10;

        /**
         * A function for `mousemove` event callback, or an object with keys as event names and values as callbacks.
         * @typedef {Object.<string, function(data)>|function(data)} CursorTrackerRequestHandler
         */

        /**
         * @param {!CursorTrackerRequestHandler} handler
         * @param {number=} fps
         * @constructor
         */
        CursorTracker.Requester = function (handler, fps) {
            this.handler = handler;
            this.fps = fps || CursorTracker.minFPS;
            this.mousemove =  handler.mousemove ?
                framed(this.fps, handler.mousemove) :
                (isFunc(handler) ? framed(this.fps, handler) : noop);
            this.mousedown = handler.mousedown ? framed(this.fps, handler.mousedown) : noop;
            this.click = handler.click ? framed(this.fps, handler.click) : noop;
            this.scroll = handler.scroll ? framed(this.fps, handler.scroll) : noop;
            this.resize = handler.resize ? framed(this.fps, handler.resize) : noop;
        };

        CursorTracker.prototype = {

            /**
             * @returns {CursorTracker}
             */
            request: function () {
                this.requesters.push(createObj(CursorTracker.Requester, arguments));
                this.apply();
                return this;
            },

            /**
             * @param {?CursorTrackerRequestHandler} handler
             * @returns {boolean}
             */
            release: function (handler) {
                var i, removed = false;
                while (( i = $.inArray(this.findRequester(handler), this.requesters)) !== -1) {
                    this.requesters.splice(i, 1);
                    removed = true;
                }
                removed && this.apply();
                return removed;
            },

            /**
             * @param {!CursorTrackerRequestHandler} handler
             * @returns {?CursorTracker.Requester}
             */
            findRequester: function (handler) {
                return $.grep( this.requesters, function (requester) {
                        return requester.handler === handler;
                    })[0] || null;
            },

            /**
             * @returns {number}
             */
            getMaxFPS: function () {
                return w.Math.max.apply(null, $.map(this.requesters, function (requester) {
                    return requester.fps;
                }).concat(CursorTracker.minFPS));
            },

            /**
             * @returns {CursorTracker}
             */
            apply: function () {
                if (this.requesters.length) {
                    var fps = this.getMaxFPS();
                    this.onScroll.setFPS(fps);
                    this.onResize.setFPS(fps);
                    this.onMouseMove.setFPS(fps);
                    this.onMouseDown.setFPS(fps);
                    this.onClick.setFPS(fps);
                    this.updateScrollData();
                    this.updateViewportData();
                    this.addEventListeners();
                } else {
                    this.removeEventListeners();
                }
                return this;
            },

            /**
             * @param {string} action Event name eg. `mousemove`, `click`
             */
            notify: function (action) {
                var data = this.data;
                $.each(this.requesters, function (i, requester) {
                    requester && requester[action](data);
                });
            },

            updateViewportData: function () {
                this.data.vpW = $w.width();
                this.data.vpH = $w.height();
            },

            updateScrollData: function () {
                this.data.scrollX = (w.pageXOffset !== u) ?
                    w.pageXOffset :
                    (d.documentElement || d.body.parentNode || d.body).scrollLeft;

                this.data.scrollY = (w.pageYOffset !== u) ?
                    w.pageYOffset :
                    (d.documentElement || d.body.parentNode || d.body).scrollTop;
            },

            /**
             * @param {!Event} e
             */
            updateCursorData: function (e) {
                this.data.pageX = e.pageX;
                this.data.pageY = e.pageY;
                this.data.target = e.target;
            },

            addEventListeners: function () {
                if (!this.isListening) {
                    $w.on('scroll', this.onScroll);
                    $w.on('resize', this.onResize);
                    $d.on('mousemove', this.onMouseMove);
                    $d.on('mousedown', this.onMouseDown);
                    $d.on('click', this.onClick);
                    this.isListening = true;
                }
            },

            removeEventListeners: function () {
                $w.off('scroll', this.onScroll);
                $w.off('resize', this.onResize);
                $d.off('mousemove', this.onMouseMove);
                $d.off('mousedown', this.onMouseDown);
                $d.off('click', this.onClick);
                this.isListening = false;
            },

            onScroll: function () {
                this.updateScrollData();
                this.notify('scroll');
            },

            onResize: function () {
                this.updateViewportData();
                this.notify('resize');
            },

            onMouseMove: function (e) {
                this.updateCursorData(e);
                this.notify('mousemove');
            },

            onMouseDown: function (e) {
                this.updateCursorData(e);
                this.notify('mousedown');
            },

            onClick: function (e) {
                this.updateCursorData(e);
                this.notify('click');
            }
        };

        /**
         * @class Queue
         * @param {!Array} items
         * @constructor
         */
        function Queue(items) {
            this.items = items;
        }

        Queue.prototype = {

            clear: function () {
                this.items.length = 0;
            },

            get: function (i) {
                return this.items[i];
            },

            add: function (task) {
                this.items.push(task);
            },

            remove: function (task) {
                (task = $.inArray(task, this.items)) >= 0 && this.items.splice(task, 1);
            },

            size: function () {
                return this.items.length;
            },

            last: function () {
                return this.get(this.size()-1);
            }
        };

        /**
         * @class Executor
         * @param {!Queue} queue
         * @param {!Object} workerFactory
         * @constructor
         */
        function Executor(queue, workerFactory) {
            this.tasks = queue;
            this.wFactory = workerFactory;
            this.inProcess = false;
            this.reschedule = false;
        }

        /**
         * @enum Executor.COMMAND
         */
        Executor.COMMAND = {
            SET: 'set',
            DEFAULTS: 'defaults',
            CREATE: 'create',
            SEND: 'send',
            WAIT: 'wait'
        };

        Executor.prototype = {

            processTasks: function () {
                var exe = this, i, tks = this.tasks, l = tks.size(), processed = [], pending = [];
                if (!l) {
                    return;
                }
                if (exe.inProcess) {
                    exe.reschedule = true;
                } else {
                    logV('scheduling tasks: ' + l);
                    exe.inProcess = true;

                    var processTask = function (task) {
                        var process = exe.processTask(task);
                        if (process) {
                            pending.push(process);
                            DfdLite.when(process).done(function () {
                                processed.push(task);
                                logV('processed task', task);
                                task.cb && async(task.cb, u, [task.worker]);
                            });
                        }
                    };

                    for(i = 0; i < l;) {
                        processTask(tks.get(i++));
                    }
                    DfdLite.all(pending).always(function () {
                        logV(processed.length + ' done');
                        for (i = 0; i < processed.length;) {
                            tks.remove(processed[i++]);
                        }
                        logV(tks.size() + ' left', tks);
                        exe.inProcess = false;
                        if (exe.reschedule) {
                            logV('rescheduling');
                            exe.reschedule = false;
                            exe.processTasks();
                        }
                    });
                }
            },

            /**
             * @param {!Array} task
             * @returns {boolean|Promise}
             */
            processTask: function (task) {
                var command = task[0], args = slice.call(task, 1), parts;
                try {
                    if ($.isFunction(command)) {
                        return command(this.wFactory.get());
                    } else {
                        parts = command.split('.');
                        command = parts[1] || command;
                        if (command === Executor.COMMAND.CREATE) {
                            return (task.worker = this.wFactory.create.apply(this.wFactory, args));
                        }
                        task.worker = (parts.length > 1) ? this.wFactory.getByName(parts[0]) : this.wFactory.get();
                        switch (command) {
                            case Executor.COMMAND.SEND:
                                return Worker.processor.send(task.worker, args);
                            case Executor.COMMAND.SET:
                                return Worker.processor.set(task.worker, args);
                            case Executor.COMMAND.DEFAULTS:
                                return Worker.processor.set(task.worker, args, true);
                            case Executor.COMMAND.WAIT:
                                return Worker.processor.wait(task.worker, args);
                            default:
                                return false;
                        }


                    }
                } catch (e) {
                    logE(e);
                    return false;
                }
                return true;
            }
        };

        /**
         * @class Worker
         * @param {string} id
         * @param {string=} name
         * @constructor
         */
        function Worker (id, name) {
            this._fields = {
                ':id': id,
                ':name': name || Worker.factory.defaultName
            };
            this._collectors = [];
        }

        /**
         * @static
         * @type {Resource}
         */
        Worker.resource = new Resource('collect', u);

        /**
         * @typedef {Object} WorkerFactory
         * @property {CursorTracker} cursorT
         * @property {string} defaultName
         * @property {?Worker} defaultW
         * @property {!Array} storage
         * @property {!Function} create
         * @property {!Function} getByName
         * @property {!Function} get
         */

        /**
         * @static
         * @type {WorkerFactory}
         */
        Worker.factory = {
            cursorT: new CursorTracker(),
            defaultName: 'w0',
            defaultW: null,
            storage: [],
            /**
             * @returns {Object}
             */
            create: function () {
                var wkr = createObj(Worker, arguments);
                try {
                    wkr.addCollector(new Worker.BaseCollector(wkr).collect());
                    wkr.addCollector(new Worker.DeviceCollector(wkr).collect());
                    wkr.addCollector(new Worker.EventCollector(wkr).collect());
                } catch (e) {logE(e);}
                this.storage.push(wkr);
                return wkr;
            },
            getByName: function (name) {
                return $.grep(Worker.factory.storage, function (d) { return d.get('name') === name; })[0] || null;
            },
            get: function () {
                return this.defaultW ? this.defaultW : (this.defaultW = this.storage[0] || null);
            }
        };

        /**
         * @enum Worker.HIT
         */
        Worker.HIT = {
            PAGEVIEW: 'pageview',
            EVENT: 'event',
            MOUSETRACK: 'mousetrack'
        };

        /**
         * @static
         * @function generateCID
         * @memberof Worker
         * @returns {string}
         */
        Worker.generateCID = function () {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
                return v.toString(16);
            });
        };

        /**
         * @class Worker.BaseCollector
         * @extends Collector
         */
        Worker.BaseCollector = Collector.extend({

            collect: function () {
                var location = w.location.protocol +
                    '//' + w.location.hostname +
                    w.location.pathname +
                    w.location.search;
                this.worker.set({
                    clientId: docCookies.getItem(KEY.CLIENT) || Worker.generateCID(),
                    referrer: d.referrer,
                    location: location,
                    title: d.title
                });
                return this;
            },

            serialize: function () {
                return {
                    wid: this.worker.get('id'),
                    cid: this.worker.get('clientId'),
                    dr: this.worker.get('referrer'),
                    dl: this.worker.get('location'),
                    dt: this.worker.get('title')
                };
            }
        });

        /**
         * @class Worker.DeviceCollector
         * @extends Collector
         */
        Worker.DeviceCollector = Collector.extend({

            collect: function () {
                this.worker.set('device', {
                    screenWidth: w.screen.width,
                    screenHeight: w.screen.height,
                    viewWidth: $w.width(),
                    viewHeight: $w.height(),
                    language: w.navigator.language,
                    userAgent: w.navigator.userAgent
                });
                return this;
            },

            serialize: function () {
                var device = this.worker.get('device');
                return {
                    d: device && {
                        w: device.screenWidth,
                        h: device.screenHeight,
                        vw: device.viewWidth,
                        vh: device.viewHeight,
                        l: device.language,
                        ua: device.userAgent
                    } || {}
                };
            }
        });

        /**
         * @class Worker.EventCollector
         * @extends Collector
         */
        Worker.EventCollector = Collector.extend({

            hitTypes: [Worker.HIT.EVENT],

            collect: function () {
                return this;
            },

            serialize: function () {
                var event = this.worker.get('event');
                return event && {
                        ec: event.c,
                        ea: event.a,
                        ev: event.v
                    } || {};
            }
        });

        /**
         * @static
         * @function serialize
         * @memberof Worker
         * @param {Worker.HIT} hitType
         * @param {!Worker} worker
         * @returns {Object}
         */
        Worker.serialize = function (hitType, worker) {
            var s = {};
            $.each(worker._collectors, function (i, collector) {
                if (!collector.hitTypes.length || $.inArray(hitType, collector.hitTypes) !== -1) {
                    $.extend(s, collector.serialize());
                }
            });
            return s;
        };

        /**
         * @typedef {Object} WorkerProcessor
         */

        /**
         * @static
         * @type {WorkerProcessor}
         */
        Worker.processor = {

            /**
             * @param {!Worker} worker
             * @param {!Array} args
             * @param {boolean=} ifUndefined
             * @returns {Worker.processor}
             */
            set: function (worker, args, ifUndefined) {
                var that = this, field = args[0], value = args[1], previous;
                if (isObj(field)) {
                    $.each(field, function (key, val) {
                        that.set(worker, [key, val], ifUndefined);
                    });
                } else {
                    previous = worker._fields[':' + field];
                    worker._fields[':' + field] = ifUndefined ? (previous !== u ? previous : value) : value;
                }
                return this;
            },

            /**
             * @param {!Worker} worker
             * @param {!Array} args
             * @returns {boolean|Promise}
             */
            send: function (worker, args) {
                var hitType = args[0],
                    promise;

                switch (hitType) {
                    case Worker.HIT.PAGEVIEW:
                        promise = Worker.resource.create(Worker.serialize(hitType, worker), {
                            hitType: hitType
                        });
                        break;
                    case Worker.HIT.EVENT:
                        promise = this._sendEvent(worker, args[1], args[2], args[3]);
                        break;
                    default:
                        return false;
                }

                return promise.done(function () {
                    docCookies.setItem(KEY.CLIENT, worker.get('clientId'), new Date(new Date()*1 + 60*60*24*365*2*1000));
                    logV('sent hit [' + hitType + '] for worker [' + worker.get('id') + '] "' + worker.get('name') + '"');
                });

            },

            /**
             * @param {!Worker} worker
             * @param {!Array} modules
             * @returns {Promise}
             */
            wait: function (worker, modules) {
                var i = 0, l = modules.length,
                    promises = [], id = worker.get('id');

                var collectPromises = function (name) {
                    switch (name) {
                        case MODULE.DEPAGINATOR:
                            promises.push($.when(0, waitModules(name).done(function () {
                                worker.depaginator || (worker.depaginator = new ctrl.client.Depaginator(worker));
                            })).then(function () {
                                return worker.depaginator;
                            }));
                            break;
                    }
                };
                for (; i < l;) {
                    collectPromises(modules[i++]);
                }
                return $.when.apply($, promises);
            },

            /**
             * @param {!Worker} worker
             * @param {string} category
             * @param {string} action
             * @param {*=} value
             * @returns {Promise}
             * @private
             */
            _sendEvent: function (worker, category, action, value) {
                var payload = Worker.serialize(Worker.HIT.EVENT, worker.set('event', {
                    c: category,
                    a: action,
                    v: value
                }));
                worker.set('event', u);
                return Worker.resource.create(payload, {
                    hitType: Worker.HIT.EVENT
                });
            }

        };

        Worker.prototype = {

            /**
             * @param {string} field
             * @returns {*}
             */
            get: function (field) {
                return this._fields[':' + field];
            },

            /**
             * @returns {Worker}
             */
            set: function (/* args.. */) {
                Worker.processor.set(this, arguments);
                return this;
            },

            /**
             * @returns {Worker}
             */
            defaults: function (/* args.. */) {
                Worker.processor.set(this, arguments, true);
                return this;
            },

            /**
             * @returns {*|Promise}
             */
            send: function (/* args.. */) {
                return Worker.processor.send(this, arguments);
            },

            /**
             * @returns {Promise}
             */
            wait: function (/* args.. */) {
                return Worker.processor.wait(this, arguments);
            },

            /**
             * @param {!Collector} c
             * @returns {Worker}
             */
            addCollector: function (c) {
                if (!(c instanceof Collector)) {
                    throw new Error('argument should be an instance of Collector');
                }
                this._collectors.push(c);
                return this;
            }

        };

        /**
         * @class Ctrl
         * @param {!Executor} executor
         * @constructor
         */
        function Ctrl(executor) {
            this.executor = executor;
            this.client = u;
        }

        Ctrl.prototype = {

            init: function () {
                logV('initializing with jQuery v' + $.fn.jquery);

                async(function () {
                    this.executor.processTasks();
                }, this);

                this.client = function clientExecutor () {
                    ctrl.executor.tasks.add(arguments);
                    ctrl.executor.processTasks();
                    return {
                        then: function (c) {
                            ctrl.executor.tasks.last().cb = c;
                        }
                    };
                };
                this.client.getByName = this.executor.wFactory.getByName;
                this.client.getAll = function () {
                    return ctrl.executor.wFactory.storage.slice();
                };
                this.client.cursor = this.executor.wFactory.cursorT;

                return this;
            }
        };

        return (w[namespace] = (ctrl = new Ctrl(
            new Executor(
                new Queue(params.q),
                Worker.factory
            )
        )).init().client);
    }

    return (function onLoad () {
        DfdLite
            .all([
                (function () {
                    var v = $ && $.fn && $.fn.jquery && $.fn.jquery.split('.');
                    return v && v[0]*1 > 0 && v[1]*1 >= 8 && $;
                })() || loadModule(MODULE.JQUERY),
                (function () {
                    return typeof w.JSON !== 'undefined' && w.JSON;
                })() || loadModule(MODULE.JSON),
                (w.sessionStorage || docCookies)
            ])
            .done(function (results) {
                var jQuery = results[0];
                clientStorage = results[2];
                try {
                    $ !== jQuery && ($ = jQuery.noConflict());

                    loadScript = function(url, onLoad) {
                        return jQuery.ajax({
                            dataType: "script",
                            cache: true,
                            url: url
                        }).then(onLoad); // onLoad has ability to override promise resolved value
                    };

                    bootstrap().exports = {
                        cdn: params.cdn,
                        api: params.api,
                        util: {
                            async: async,
                            framed: framed,
                            debounce: debounce,
                            logV: logV,
                            loadScript: loadScript,
                            clientStorage: clientStorage,
                            uniqueCID: uniqueCID
                        },
                        classes: {
                            Abstract: Abstract,
                            Collector: Collector,
                            Resource: Resource,
                            DfdLite: DfdLite
                        }
                    };
                } catch (e) {
                    logE(e);
                }
            });
    })();


})(document, window, window.__CoolblueNamespace__, function(){});
