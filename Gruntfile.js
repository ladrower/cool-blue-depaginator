/*global module:false*/
module.exports = function (grunt) {
    'use strict';

    var baseConfig = {
        buildDir: 'dist'
    };

    /**
     * Init config
     */
    grunt.initConfig(baseConfig);

    grunt.loadNpmTasks("grunt-extend-config");
    grunt.extendConfig({
        pkg: grunt.file.readJSON('package.json'),
        meta: {
            banner: '\n/**\n' +
            ' * <%= pkg.name %> - v<%= pkg.version %> - <%= grunt.template.today("yyyy-mm-dd") %>\n' +
            ' */\n'
        }
    });
    grunt.log.write(grunt.config('meta.banner'));

    /**
     * Validate files with JSHint
     */
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.extendConfig({
        jshint: {
            options: {
                jshintrc: '.jshintrc'
            },
            gruntfile: [
                'Gruntfile.js'
            ],
            main: ['src/*.js']
        }
    });

    /**
     * Clean task
     */
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.extendConfig({
        clean: {
            build: ['<%= buildDir %>']
        }
    });

    /**
     * Copy task
     */
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.extendConfig({
        copy: {
            js: {
                files: [
                    {
                        src: ['lib/**/*.js', 'polyfill/**/*.js'],
                        dest: '<%= buildDir %>/',
                        cwd: 'src',
                        expand: true
                    },
                    {
                        src: ['*.js'],
                        dest: '<%= buildDir %>/',
                        cwd: 'src',
                        expand: true
                    }
                ]
            }
        }
    });

    /**
     * Minify js
     */
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.extendConfig({
        uglify: {
            options: {
                mangle: true,
                compress: true,
                banner: '/*! <%= pkg.name %> v<%= pkg.version %> */\n'
            },
            main: {
                files: [{
                    expand: true,
                    cwd: '<%= buildDir %>',
                    src: '*.js',
                    dest: '<%= buildDir %>'
                }]
            }
        }
    });

    grunt.registerTask('build', [
        'jshint', 'clean', 'copy', 'uglify'
    ]);

};
