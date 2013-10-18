#!/usr/bin/env node
var BuildPackage=(function(undef){

    /**************************************************************************************
    #
    #   Build a (js,css) package library based, 
    #   on a dependencies file, 
    #   using various compilers (UglifyJS, Closure)
    #
    #   Node: 0.8+ (ca. 2012, 2013)
    #   temp module, commander module  required
    **************************************************************************************/
    
    // commander module inline
    var commanderInline=(function(){
        /*!
         * commander
         * Copyright(c) 2011 TJ Holowaychuk <tj@vision-media.ca>
         * MIT Licensed
         */

        /**
         * Module dependencies.
         */

        var EventEmitter = require('events').EventEmitter
          , spawn = require('child_process').spawn
          //, keypress = require('keypress')
          , fs = require('fs')
          , exists = fs.existsSync
          , path = require('path')
          , tty = require('tty')
          , dirname = path.dirname
          , basename = path.basename;

        /**
         * Expose the root command.
         */

        //exports = module.exports = new Command;

        /**
         * Expose `Command`.
         */

        //exports.Command = Command;

        /**
         * Expose `Option`.
         */

        //exports.Option = Option;

        /**
         * Initialize a new `Option` with the given `flags` and `description`.
         *
         * @param {String} flags
         * @param {String} description
         * @api public
         */

        function Option(flags, description) {
          this.flags = flags;
          this.required = ~flags.indexOf('<');
          this.optional = ~flags.indexOf('[');
          this.bool = !~flags.indexOf('-no-');
          flags = flags.split(/[ ,|]+/);
          if (flags.length > 1 && !/^[[<]/.test(flags[1])) this.short = flags.shift();
          this.long = flags.shift();
          this.description = description || '';
        }

        /**
         * Return option name.
         *
         * @return {String}
         * @api private
         */

        Option.prototype.name = function(){
          return this.long
            .replace('--', '')
            .replace('no-', '');
        };

        /**
         * Check if `arg` matches the short or long flag.
         *
         * @param {String} arg
         * @return {Boolean}
         * @api private
         */

        Option.prototype.is = function(arg){
          return arg == this.short
            || arg == this.long;
        };

        /**
         * Initialize a new `Command`.
         *
         * @param {String} name
         * @api public
         */

        function Command(name) {
          this.commands = [];
          this.options = [];
          this._args = [];
          this._name = name;
        }

        /**
         * Inherit from `EventEmitter.prototype`.
         */

        Command.prototype.__proto__ = EventEmitter.prototype;

        /**
         * Add command `name`.
         *
         * The `.action()` callback is invoked when the
         * command `name` is specified via __ARGV__,
         * and the remaining arguments are applied to the
         * function for access.
         *
         * When the `name` is "*" an un-matched command
         * will be passed as the first arg, followed by
         * the rest of __ARGV__ remaining.
         *
         * Examples:
         *
         *      program
         *        .version('0.0.1')
         *        .option('-C, --chdir <path>', 'change the working directory')
         *        .option('-c, --config <path>', 'set config path. defaults to ./deploy.conf')
         *        .option('-T, --no-tests', 'ignore test hook')
         *     
         *      program
         *        .command('setup')
         *        .description('run remote setup commands')
         *        .action(function(){
         *          console.log('setup');
         *        });
         *     
         *      program
         *        .command('exec <cmd>')
         *        .description('run the given remote command')
         *        .action(function(cmd){
         *          console.log('exec "%s"', cmd);
         *        });
         *     
         *      program
         *        .command('*')
         *        .description('deploy the given env')
         *        .action(function(env){
         *          console.log('deploying "%s"', env);
         *        });
         *     
         *      program.parse(process.argv);
          *
         * @param {String} name
         * @param {String} [desc]
         * @return {Command} the new command
         * @api public
         */

        Command.prototype.command = function(name, desc){
          var args = name.split(/ +/);
          var cmd = new Command(args.shift());
          if (desc) cmd.description(desc);
          if (desc) this.executables = true;
          this.commands.push(cmd);
          cmd.parseExpectedArgs(args);
          cmd.parent = this;
          if (desc) return this;
          return cmd;
        };

        /**
         * Add an implicit `help [cmd]` subcommand
         * which invokes `--help` for the given command.
         *
         * @api private
         */

        Command.prototype.addImplicitHelpCommand = function() {
          this.command('help [cmd]', 'display help for [cmd]');
        };

        /**
         * Parse expected `args`.
         *
         * For example `["[type]"]` becomes `[{ required: false, name: 'type' }]`.
         *
         * @param {Array} args
         * @return {Command} for chaining
         * @api public
         */

        Command.prototype.parseExpectedArgs = function(args){
          if (!args.length) return;
          var self = this;
          args.forEach(function(arg){
            switch (arg[0]) {
              case '<':
                self._args.push({ required: true, name: arg.slice(1, -1) });
                break;
              case '[':
                self._args.push({ required: false, name: arg.slice(1, -1) });
                break;
            }
          });
          return this;
        };

        /**
         * Register callback `fn` for the command.
         *
         * Examples:
         *
         *      program
         *        .command('help')
         *        .description('display verbose help')
         *        .action(function(){
         *           // output help here
         *        });
         *
         * @param {Function} fn
         * @return {Command} for chaining
         * @api public
         */

        Command.prototype.action = function(fn){
          var self = this;
          this.parent.on(this._name, function(args, unknown){    
            // Parse any so-far unknown options
            unknown = unknown || [];
            var parsed = self.parseOptions(unknown);
            
            // Output help if necessary
            outputHelpIfNecessary(self, parsed.unknown);
            
            // If there are still any unknown options, then we simply 
            // die, unless someone asked for help, in which case we give it
            // to them, and then we die.
            if (parsed.unknown.length > 0) {      
              self.unknownOption(parsed.unknown[0]);
            }
            
            // Leftover arguments need to be pushed back. Fixes issue #56
            if (parsed.args.length) args = parsed.args.concat(args);
            
            self._args.forEach(function(arg, i){
              if (arg.required && null == args[i]) {
                self.missingArgument(arg.name);
              }
            });
            
            // Always append ourselves to the end of the arguments,
            // to make sure we match the number of arguments the user
            // expects
            if (self._args.length) {
              args[self._args.length] = self;
            } else {
              args.push(self);
            }
            
            fn.apply(this, args);
          });
          return this;
        };

        /**
         * Define option with `flags`, `description` and optional
         * coercion `fn`. 
         *
         * The `flags` string should contain both the short and long flags,
         * separated by comma, a pipe or space. The following are all valid
         * all will output this way when `--help` is used.
         *
         *    "-p, --pepper"
         *    "-p|--pepper"
         *    "-p --pepper"
         *
         * Examples:
         *
         *     // simple boolean defaulting to false
         *     program.option('-p, --pepper', 'add pepper');
         *
         *     --pepper
         *     program.pepper
         *     // => Boolean
         *
         *     // simple boolean defaulting to false
         *     program.option('-C, --no-cheese', 'remove cheese');
         *
         *     program.cheese
         *     // => true
         *
         *     --no-cheese
         *     program.cheese
         *     // => true
         *
         *     // required argument
         *     program.option('-C, --chdir <path>', 'change the working directory');
         *
         *     --chdir /tmp
         *     program.chdir
         *     // => "/tmp"
         *
         *     // optional argument
         *     program.option('-c, --cheese [type]', 'add cheese [marble]');
         *
         * @param {String} flags
         * @param {String} description
         * @param {Function|Mixed} fn or default
         * @param {Mixed} defaultValue
         * @return {Command} for chaining
         * @api public
         */

        Command.prototype.option = function(flags, description, fn, defaultValue){
          var self = this
            , option = new Option(flags, description)
            , oname = option.name()
            , name = camelcase(oname);

          // default as 3rd arg
          if ('function' != typeof fn) defaultValue = fn, fn = null;

          // preassign default value only for --no-*, [optional], or <required>
          if (false == option.bool || option.optional || option.required) {
            // when --no-* we make sure default is true
            if (false == option.bool) defaultValue = true;
            // preassign only if we have a default
            if (undefined !== defaultValue) self[name] = defaultValue;
          }

          // register the option
          this.options.push(option);

          // when it's passed assign the value
          // and conditionally invoke the callback
          this.on(oname, function(val){
            // coercion
            if (null != val && fn) val = fn(val);

            // unassigned or bool
            if ('boolean' == typeof self[name] || 'undefined' == typeof self[name]) {
              // if no value, bool true, and we have a default, then use it!
              if (null == val) {
                self[name] = option.bool
                  ? defaultValue || true
                  : false;
              } else {
                self[name] = val;
              }
            } else if (null !== val) {
              // reassign
              self[name] = val;
            }
          });

          return this;
        };

        /**
         * Parse `argv`, settings options and invoking commands when defined.
         *
         * @param {Array} argv
         * @return {Command} for chaining
         * @api public
         */

        Command.prototype.parse = function(argv){
          // implicit help
          if (this.executables) this.addImplicitHelpCommand();

          // store raw args
          this.rawArgs = argv;

          // guess name
          this._name = this._name || basename(argv[1]);

          // process argv
          var parsed = this.parseOptions(this.normalize(argv.slice(2)));
          var args = this.args = parsed.args;
         
          // executable sub-commands, skip .parseArgs()
          if (this.executables) return this.executeSubCommand(argv, args, parsed.unknown);

          return this.parseArgs(this.args, parsed.unknown);
        };

        /**
         * Execute a sub-command executable.
         *
         * @param {Array} argv
         * @param {Array} args
         * @param {Array} unknown
         * @api private
         */

        Command.prototype.executeSubCommand = function(argv, args, unknown) {
          args = args.concat(unknown);

          if (!args.length) this.help();
          if ('help' == args[0] && 1 == args.length) this.help();

          // <cmd> --help
          if ('help' == args[0]) {
            args[0] = args[1];
            args[1] = '--help';
          }

          // executable
          var dir = dirname(argv[1]);
          var bin = basename(argv[1]) + '-' + args[0];

          // check for ./<bin> first
          var local = path.join(dir, bin);
          if (exists(local)) bin = local;

          // run it
          args = args.slice(1);
          var proc = spawn(bin, args, { stdio: 'inherit', customFds: [0, 1, 2] });
          proc.on('exit', function(code){
            if (code == 127) {
              console.error('\n  %s(1) does not exist\n', bin);
            }
          });
        };

        /**
         * Normalize `args`, splitting joined short flags. For example
         * the arg "-abc" is equivalent to "-a -b -c".
         * This also normalizes equal sign and splits "--abc=def" into "--abc def".
         *
         * @param {Array} args
         * @return {Array}
         * @api private
         */

        Command.prototype.normalize = function(args){
          var ret = []
            , arg
            , index;

          for (var i = 0, len = args.length; i < len; ++i) {
            arg = args[i];
            if (arg.length > 1 && '-' == arg[0] && '-' != arg[1]) {
              arg.slice(1).split('').forEach(function(c){
                ret.push('-' + c);
              });
            } else if (/^--/.test(arg) && ~(index = arg.indexOf('='))) {
              ret.push(arg.slice(0, index), arg.slice(index + 1));
            } else {
              ret.push(arg);
            }
          }

          return ret;
        };

        /**
         * Parse command `args`.
         *
         * When listener(s) are available those
         * callbacks are invoked, otherwise the "*"
         * event is emitted and those actions are invoked.
         *
         * @param {Array} args
         * @return {Command} for chaining
         * @api private
         */

        Command.prototype.parseArgs = function(args, unknown){
          var cmds = this.commands
            , len = cmds.length
            , name;

          if (args.length) {
            name = args[0];
            if (this.listeners(name).length) {
              this.emit(args.shift(), args, unknown);
            } else {
              this.emit('*', args);
            }
          } else {
            outputHelpIfNecessary(this, unknown);
            
            // If there were no args and we have unknown options,
            // then they are extraneous and we need to error.
            if (unknown.length > 0) {      
              this.unknownOption(unknown[0]);
            }
          }

          return this;
        };

        /**
         * Return an option matching `arg` if any.
         *
         * @param {String} arg
         * @return {Option}
         * @api private
         */

        Command.prototype.optionFor = function(arg){
          for (var i = 0, len = this.options.length; i < len; ++i) {
            if (this.options[i].is(arg)) {
              return this.options[i];
            }
          }
        };

        /**
         * Parse options from `argv` returning `argv`
         * void of these options.
         *
         * @param {Array} argv
         * @return {Array}
         * @api public
         */

        Command.prototype.parseOptions = function(argv){
          var args = []
            , len = argv.length
            , literal
            , option
            , arg;

          var unknownOptions = [];

          // parse options
          for (var i = 0; i < len; ++i) {
            arg = argv[i];

            // literal args after --
            if ('--' == arg) {
              literal = true;
              continue;
            }

            if (literal) {
              args.push(arg);
              continue;
            }

            // find matching Option
            option = this.optionFor(arg);

            // option is defined
            if (option) {
              // requires arg
              if (option.required) {
                arg = argv[++i];
                if (null == arg) return this.optionMissingArgument(option);
                if ('-' == arg[0]) return this.optionMissingArgument(option, arg);
                this.emit(option.name(), arg);
              // optional arg
              } else if (option.optional) {
                arg = argv[i+1];
                if (null == arg || '-' == arg[0]) {
                  arg = null;
                } else {
                  ++i;
                }
                this.emit(option.name(), arg);
              // bool
              } else {
                this.emit(option.name());
              }
              continue;
            }
            
            // looks like an option
            if (arg.length > 1 && '-' == arg[0]) {
              unknownOptions.push(arg);
              
              // If the next argument looks like it might be
              // an argument for this option, we pass it on.
              // If it isn't, then it'll simply be ignored
              if (argv[i+1] && '-' != argv[i+1][0]) {
                unknownOptions.push(argv[++i]);
              }
              continue;
            }
            
            // arg
            args.push(arg);
          }
          
          return { args: args, unknown: unknownOptions };
        };

        /**
         * Argument `name` is missing.
         *
         * @param {String} name
         * @api private
         */

        Command.prototype.missingArgument = function(name){
          console.error();
          console.error("  error: missing required argument `%s'", name);
          console.error();
          process.exit(1);
        };

        /**
         * `Option` is missing an argument, but received `flag` or nothing.
         *
         * @param {String} option
         * @param {String} flag
         * @api private
         */

        Command.prototype.optionMissingArgument = function(option, flag){
          console.error();
          if (flag) {
            console.error("  error: option `%s' argument missing, got `%s'", option.flags, flag);
          } else {
            console.error("  error: option `%s' argument missing", option.flags);
          }
          console.error();
          process.exit(1);
        };

        /**
         * Unknown option `flag`.
         *
         * @param {String} flag
         * @api private
         */

        Command.prototype.unknownOption = function(flag){
          console.error();
          console.error("  error: unknown option `%s'", flag);
          console.error();
          process.exit(1);
        };


        /**
         * Set the program version to `str`.
         *
         * This method auto-registers the "-V, --version" flag
         * which will print the version number when passed.
         *
         * @param {String} str
         * @param {String} flags
         * @return {Command} for chaining
         * @api public
         */

        Command.prototype.version = function(str, flags){
          if (0 == arguments.length) return this._version;
          this._version = str;
          flags = flags || '-V, --version';
          this.option(flags, 'output the version number');
          this.on('version', function(){
            console.log(str);
            process.exit(0);
          });
          return this;
        };

        /**
         * Set the description `str`.
         *
         * @param {String} str
         * @return {String|Command}
         * @api public
         */

        Command.prototype.description = function(str){
          if (0 == arguments.length) return this._description;
          this._description = str;
          return this;
        };

        /**
         * Set / get the command usage `str`.
         *
         * @param {String} str
         * @return {String|Command}
         * @api public
         */

        Command.prototype.usage = function(str){
          var args = this._args.map(function(arg){
            return arg.required
              ? '<' + arg.name + '>'
              : '[' + arg.name + ']';
          });

          var usage = '[options'
            + (this.commands.length ? '] [command' : '')
            + ']'
            + (this._args.length ? ' ' + args : '');

          if (0 == arguments.length) return this._usage || usage;
          this._usage = str;

          return this;
        };

        /**
         * Return the largest option length.
         *
         * @return {Number}
         * @api private
         */

        Command.prototype.largestOptionLength = function(){
          return this.options.reduce(function(max, option){
            return Math.max(max, option.flags.length);
          }, 0);
        };

        /**
         * Return help for options.
         *
         * @return {String}
         * @api private
         */

        Command.prototype.optionHelp = function(){
          var width = this.largestOptionLength();
          
          // Prepend the help information
          return [pad('-h, --help', width) + '  ' + 'output usage information']
            .concat(this.options.map(function(option){
              return pad(option.flags, width)
                + '  ' + option.description;
              }))
            .join('\n');
        };

        /**
         * Return command help documentation.
         *
         * @return {String}
         * @api private
         */

        Command.prototype.commandHelp = function(){
          if (!this.commands.length) return '';
          return [
              ''
            , '  Commands:'
            , ''
            , this.commands.map(function(cmd){
              var args = cmd._args.map(function(arg){
                return arg.required
                  ? '<' + arg.name + '>'
                  : '[' + arg.name + ']';
              }).join(' ');

              return pad(cmd._name
                + (cmd.options.length 
                  ? ' [options]'
                  : '') + ' ' + args, 22)
                + (cmd.description()
                  ? ' ' + cmd.description()
                  : '');
            }).join('\n').replace(/^/gm, '    ')
            , ''
          ].join('\n');
        };

        /**
         * Return program help documentation.
         *
         * @return {String}
         * @api private
         */

        Command.prototype.helpInformation = function(){
          return [
              ''
            , '  Usage: ' + this._name + ' ' + this.usage()
            , '' + this.commandHelp()
            , '  Options:'
            , ''
            , '' + this.optionHelp().replace(/^/gm, '    ')
            , ''
            , ''
          ].join('\n');
        };

        /**
         * Prompt for a `Number`.
         *
         * @param {String} str
         * @param {Function} fn
         * @api private
         */

        Command.prototype.promptForNumber = function(str, fn){
          var self = this;
          this.promptSingleLine(str, function parseNumber(val){
            val = Number(val);
            if (isNaN(val)) return self.promptSingleLine(str + '(must be a number) ', parseNumber);
            fn(val);
          });
        };

        /**
         * Prompt for a `Date`.
         *
         * @param {String} str
         * @param {Function} fn
         * @api private
         */

        Command.prototype.promptForDate = function(str, fn){
          var self = this;
          this.promptSingleLine(str, function parseDate(val){
            val = new Date(val);
            if (isNaN(val.getTime())) return self.promptSingleLine(str + '(must be a date) ', parseDate);
            fn(val);
          });
        };

        /**
         * Single-line prompt.
         *
         * @param {String} str
         * @param {Function} fn
         * @api private
         */

        Command.prototype.promptSingleLine = function(str, fn){
          if ('function' == typeof arguments[2]) {
            return this['promptFor' + (fn.name || fn)](str, arguments[2]);
          }

          process.stdout.write(str);
          process.stdin.setEncoding('utf8');
          process.stdin.once('data', function(val){
            fn(val.trim());
          }).resume();
        };

        /**
         * Multi-line prompt.
         *
         * @param {String} str
         * @param {Function} fn
         * @api private
         */

        Command.prototype.promptMultiLine = function(str, fn){
          var buf = [];
          console.log(str);
          process.stdin.setEncoding('utf8');
          process.stdin.on('data', function(val){
            if ('\n' == val || '\r\n' == val) {
              process.stdin.removeAllListeners('data');
              fn(buf.join('\n'));
            } else {
              buf.push(val.trimRight());
            }
          }).resume();
        };

        /**
         * Prompt `str` and callback `fn(val)`
         *
         * Commander supports single-line and multi-line prompts.
         * To issue a single-line prompt simply add white-space
         * to the end of `str`, something like "name: ", whereas
         * for a multi-line prompt omit this "description:".
         *
         *
         * Examples:
         *
         *     program.prompt('Username: ', function(name){
         *       console.log('hi %s', name);
         *     });
         *     
         *     program.prompt('Description:', function(desc){
         *       console.log('description was "%s"', desc.trim());
         *     });
         *
         * @param {String|Object} str
         * @param {Function} fn
         * @api public
         */

        Command.prototype.prompt = function(str, fn){
          var self = this;

          if ('string' == typeof str) {
            if (/ $/.test(str)) return this.promptSingleLine.apply(this, arguments);
            this.promptMultiLine(str, fn);
          } else {
            var keys = Object.keys(str)
              , obj = {};

            function next() {
              var key = keys.shift()
                , label = str[key];

              if (!key) return fn(obj);
              self.prompt(label, function(val){
                obj[key] = val;
                next();
              });
            }

            next();
          }
        };

        /**
         * Prompt for password with `str`, `mask` char and callback `fn(val)`.
         *
         * The mask string defaults to '', aka no output is
         * written while typing, you may want to use "*" etc.
         *
         * Examples:
         *
         *     program.password('Password: ', function(pass){
         *       console.log('got "%s"', pass);
         *       process.stdin.destroy();
         *     });
         *
         *     program.password('Password: ', '*', function(pass){
         *       console.log('got "%s"', pass);
         *       process.stdin.destroy();
         *     });
         *
         * @param {String} str
         * @param {String} mask
         * @param {Function} fn
         * @api public
         */

        Command.prototype.password = function(str, mask, fn){
          var self = this
            , buf = '';

          // default mask
          if ('function' == typeof mask) {
            fn = mask;
            mask = '';
          }

          //keypress(process.stdin);

          function setRawMode(mode) {
            if (process.stdin.setRawMode) {
              process.stdin.setRawMode(mode);
            } else {
              tty.setRawMode(mode);
            }
          };
          setRawMode(true);
          process.stdout.write(str);

          // keypress
          /*process.stdin.on('keypress', function(c, key){
            if (key && 'enter' == key.name) {
              console.log();
              process.stdin.pause();
              process.stdin.removeAllListeners('keypress');
              setRawMode(false);
              if (!buf.trim().length) return self.password(str, mask, fn);
              fn(buf);
              return;
            }

            if (key && key.ctrl && 'c' == key.name) {
              console.log('%s', buf);
              process.exit();
            }

            process.stdout.write(mask);
            buf += c;
          }).resume();*/
        };

        /**
         * Confirmation prompt with `str` and callback `fn(bool)`
         *
         * Examples:
         *
         *      program.confirm('continue? ', function(ok){
         *        console.log(' got %j', ok);
         *        process.stdin.destroy();
         *      });
         *
         * @param {String} str
         * @param {Function} fn
         * @api public
         */


        Command.prototype.confirm = function(str, fn, verbose){
          var self = this;
          this.prompt(str, function(ok){
            if (!ok.trim()) {
              if (!verbose) str += '(yes or no) ';
              return self.confirm(str, fn, true);
            }
            fn(parseBool(ok));
          });
        };

        /**
         * Choice prompt with `list` of items and callback `fn(index, item)`
         *
         * Examples:
         *
         *      var list = ['tobi', 'loki', 'jane', 'manny', 'luna'];
         *      
         *      console.log('Choose the coolest pet:');
         *      program.choose(list, function(i){
         *        console.log('you chose %d "%s"', i, list[i]);
         *        process.stdin.destroy();
         *      });
         *
         * @param {Array} list
         * @param {Number|Function} index or fn
         * @param {Function} fn
         * @api public
         */

        Command.prototype.choose = function(list, index, fn){
          var self = this
            , hasDefault = 'number' == typeof index;

          if (!hasDefault) {
            fn = index;
            index = null;
          }

          list.forEach(function(item, i){
            if (hasDefault && i == index) {
              console.log('* %d) %s', i + 1, item);
            } else {
              console.log('  %d) %s', i + 1, item);
            }
          });

          function again() {
            self.prompt('  : ', function(val){
              val = parseInt(val, 10) - 1;
              if (hasDefault && isNaN(val)) val = index;

              if (null == list[val]) {
                again();
              } else {
                fn(val, list[val]);
              }
            });
          }

          again();
        };


        /**
         * Output help information for this command
         *
         * @api public
         */

        Command.prototype.outputHelp = function(){
          process.stdout.write(this.helpInformation());
          this.emit('--help');
        };

        /**
         * Output help information and exit.
         *
         * @api public
         */

        Command.prototype.help = function(){
          this.outputHelp();
          process.exit();
        };

        /**
         * Camel-case the given `flag`
         *
         * @param {String} flag
         * @return {String}
         * @api private
         */

        function camelcase(flag) {
          return flag.split('-').reduce(function(str, word){
            return str + word[0].toUpperCase() + word.slice(1);
          });
        }

        /**
         * Parse a boolean `str`.
         *
         * @param {String} str
         * @return {Boolean}
         * @api private
         */

        function parseBool(str) {
          return /^y|yes|ok|true$/i.test(str);
        }

        /**
         * Pad `str` to `width`.
         *
         * @param {String} str
         * @param {Number} width
         * @return {String}
         * @api private
         */

        function pad(str, width) {
          var len = Math.max(0, width - str.length);
          return str + Array(len + 1).join(' ');
        }

        /**
         * Output help information if necessary
         *
         * @param {Command} command to output help for
         * @param {Array} array of options to search for -h or --help
         * @api private
         */

        function outputHelpIfNecessary(cmd, options) {
          options = options || [];
          for (var i = 0; i < options.length; i++) {
            if (options[i] == '--help' || options[i] == '-h') {
              cmd.outputHelp();
              process.exit(0);
            }
          }
        }
        
        return new Command;
        
    }).call(this);

    /*  sleep module
try {
  module.exports = require('./build/Release/sleep.node');
} catch (e) {
  module.exports = {
    sleep: function(s) {
      var e = new Date().getTime() + (s * 1000);

      while (new Date().getTime() <= e) {
        ;
      }
    },

    usleep: function(s) {
      var e = new Date().getTime() + (s / 1000);

      while (new Date().getTime() <= e) {
        ;
      }
    }
  };
}    */
    
    /**************************************************************************************
    ***************************************************************************************
    ***************************************************************************************
    ***************************************************************************************
    ***************************************************************************************
    ***************************************************************************************
    **************************************************************************************/
    
    var 
        // basic modules
        //crypto = require('crypto'), 
        fs = require('fs'), 
        os = require('os'), 
        path = require('path'), 
        exec = require('child_process').exec,
        exit = process.exit, echo = console.log,
        
        // extra modules needed, temp and commander
        temp = require('temp'),
        // add it inline
        commander = commanderInline,//require('commander'),
        
        // needed variables
        /*TMPDIR=os.tmpdir(),*/ DIR=fs.realpathSync(__dirname), 
        //argv=process.argv,
        
        // some shortcuts
        hasOwn=Object.prototype.hasOwnProperty
    ; 
    
    // auxilliary methods
    var
        // http://stackoverflow.com/questions/7055061/nodejs-temporary-file-name
        //tmpfile = function() { return TMPDIR + '_tmp_'+crypto.randomBytes(7).readUInt32LE(0)+'.tmpnode'; },
        tmpfile = function() { return temp.path({suffix: '.tmpnode'}); },
        startsWith = function(s, prefix) {  return (0===s.indexOf(prefix)); },
        extend = function(o1, o2) { o1=o1||{}; for (var p in o1){ if (hasOwn.call(o2, p) && hasOwn.call(o1, p) && undef!==o2[p]) { o1[p]=o2[p]; } }; return o1; },
        unlink = function(file) { if (fs.existsSync(file)) fs.unlinkSync(file); }
        // simulate sync/async exec
        /*,__currentCmd=null, __execFinished=true,
        execAsync=exec,
        __execSync = function(cmd) {
            if (cmd && (cmd!==__currentCmd))
            {
                var options=null;/*{ encoding: 'utf8',
                              timeout: 0,
                              maxBuffer: 200*1024,
                              killSignal: 'SIGTERM',
                              cwd: null,
                              env: null };* /
                __execFinished=false;
                exec(cmd, options, function (error, stdout, stderr) { __execFinished=true; __currentCmd=null; });
            }
            return __execFinished;
        },
        execSync=function(cmd) {              
            // simulate delay with a busy loop 
            while(!__execSync(cmd)) { for (var i=0, s=0; i<30000; i++) s++; }
        }*/
     ;
        
    var self={

        args : null,
        depsFile : '',
        realpath : '',
        enc : 'utf8',
        inFiles : null,
        doMinify : false,
        useClosure : false,
        optsUglify : '',
        optsClosure : '',
        outFile : '',

        _init_ : function()  {
            self.depsFile = '';
            self.realpath = '';
            self.enc = 'utf8';
            self.inFiles = null;
            self.doMinify = false;
            self.useClosure = false;
            self.optsUglify = '';
            self.optsClosure = '';
            self.outFile = '';
        },

        /*uglify : function(src, dist) {
            var uglyfyJS = require('uglify-js'),
                jsp = uglyfyJS.parser,
                pro = uglyfyJS.uglify,
                ast = jsp.parse( fs.readFileSync(src, {encoding: self.enc}).toString() );

            ast = pro.ast_mangle(ast);
            ast = pro.ast_squeeze(ast);

            fs.writeFileSync(dist, pro.gen_code(ast), {encoding: self.enc});
            //return pro.gen_code(ast);
        },*/
        
        parseArgs : function()  {
            commander
                .option('--deps [type]', 'DEPEMDENCIES_FILE')
                .option('--closure', 'Use Java Closure, else UglifyJS Compiler (default)', false)
                .option('--enc [type]', 'set text encoding', 'utf8')
                .on('--help', function() {
                    echo ("build.js --deps DEPENDENCIES_FILE [--closure --enc ENCODING]");
                    echo("\n");
                    echo ("Build and Compress Javascript Packages");
                    echo("\n");
                    echo ("deps (String, REQUIRED): DEPENDENCIES_FILE");
                    echo ("closure (Boolean, Optional): Use Java Closure, else UglifyJS Compiler (default)");
                    echo ("enc (String, Optional): set text encoding (default utf8)");
                    echo("\n");
                })
                // parse the arguments
                .parse(process.argv);
            
            return extend({
                'deps' : false,
                'closure' : false,
                'enc' : null
                }, commander);
        },

        parseSettings : function()  {
            // settings buffers
            var deps=[], out=[], optsUglify=[], optsClosure=[];
            var currentBuffer = false;

            // settings options
            var doMinify = false, inMinifyOptions = false;

            // read the dependencies file
            var i, len, line, lines=fs.readFileSync(self.depsFile, {encoding: self.enc});
            lines=lines.split(/\n\r|\r\n|\r|\n/);
            len=lines.length;

            // parse it line-by-line
            for (i=0; i<len; i++)
            {
                // strip the line of extra spaces
                line=lines[i].replace(/^\s+/, '').replace(/\s+$/, '');

                // comment or empty line, skip it
                if (startsWith(line, '#') || ''==line) continue;

                // directive line, parse it
                if (startsWith(line, '@'))
                {
                    if (startsWith(line, '@DEPENDENCIES')) // list of input dependencies files option
                    {
                        // reference
                        currentBuffer = deps;
                        inMinifyOptions=false;
                        continue;
                    }
                    else if (startsWith(line, '@MINIFY')) // enable minification (default is UglifyJS Compiler)
                    {
                        // reference
                        currentBuffer = false;
                        doMinify=true;
                        inMinifyOptions=true;
                        continue;
                    }
                    else if (inMinifyOptions && startsWith(line, '@UGLIFY')) // Node UglifyJS Compiler options (default)
                    {
                        // reference
                        currentBuffer = optsUglify;
                        continue;
                    }
                    else if (inMinifyOptions && startsWith(line, '@CLOSURE')) // Java Closure Compiler options
                    {
                        // reference
                        currentBuffer = optsClosure;
                        continue;
                    }
                    //else if (startsWith(line, '@POSTPROCESS')) // allow postprocess options (todo)
                    //{
                    //    currentBuffer=false;
                    //    inMinifyOptions=false;
                    //    continue;
                    //}
                    else if (startsWith(line, '@OUT')) // output file option
                    {
                        // reference
                        currentBuffer = out;
                        inMinifyOptions=false;
                        continue;
                    }
                    else // unknown option or dummy separator option
                    {
                        // reference
                        currentBuffer = false;
                        inMinifyOptions=false;
                        continue;
                    }
                }
                // if any settings need to be stored, store them in the appropriate buffer
                if (currentBuffer)  currentBuffer.push(line);
            }
            
            // store the parsed settings
            self.outFile = out[0];
            if (startsWith(self.outFile, '.') && ''!=self.realpath) self.outFile=path.join(self.realpath, self.outFile);
            self.inFiles = deps;
            self.doMinify = doMinify;
            self.optsUglify = optsUglify.join(" ");
            self.optsClosure = optsClosure.join(" ");
        },

        parse : function() {
            var args = self.args = self.parseArgs();
            // if args are correct continue
            // get real-dir of deps file
            var full_path = self.depsFile = fs.realpathSync(args.deps);
            self.realpath = path.dirname(full_path);
            self.enc = args.enc;
            self.useClosure = args.closure;
            self.parseSettings();
        },

        mergeFiles : function() {
            var files=self.inFiles, count=files.length, realpath=self.realpath, buffer=[], i, filename;

            for (i=0; i<count; i++)
            {
                filename=files[i];
                if (startsWith(filename, '.') && ''!=realpath) filename=path.join(realpath, filename);
                buffer.push(fs.readFileSync(filename, {encoding: self.enc}));
            }

            return buffer.join('');
        },

        extractHeader : function(text) {
            var header = '';
            if (startsWith(text, '/*'))
            {
                header = text.substr(0, text.indexOf("*/")+2);
            }
            return header;
        },

        compress : function(text, callback) {
            var in_tuple = tmpfile(), out_tuple = tmpfile(), cmd/*, compressed*/;
            
            fs.writeFileSync(in_tuple, text, {encoding: self.enc});

            if (self.useClosure)
                // use Java Closure compiler
                cmd = "java -jar "+path.join(DIR, "compiler/compiler.jar")+" "+self.optsClosure+" --js "+in_tuple+" --js_output_file "+out_tuple;
            else
                // use Node UglifyJS compiler (default)
                cmd = "uglifyjs "+in_tuple+" "+self.optsUglify+" -o "+out_tuple;
                //self.uglify(in_tuple, out_tuple);
            
            // a chain of listeners to avoid timing issues
            exec(cmd, function (error, stdout, stderr) {
                var compressed=null;
                if (!error)
                {
                    /*fs.watchFile(out_tuple, function (curr, prev) {
                        if (Math.abs(curr.mtime-prev.mtime)<0.5)
                        {
                            fs.unwatchFile(out_tuple);
                        }
                    });*/                    
                    compressed = fs.readFileSync(out_tuple, {encoding: self.enc});
                    unlink(in_tuple);
                    unlink(out_tuple);

                    if (callback) callback(compressed);
                }
                else
                {
                    unlink(in_tuple);
                    unlink(out_tuple);
                    if (callback) callback(null, error);
                }
            });

            //return compressed;
        },

        build : function() {
            var text = self.mergeFiles(), header = '';
            var sepLine = new Array(65).join("=");
            
            if (self.doMinify)
            {
                echo (sepLine);
                echo ("Compiling and Minifying " + ((self.useClosure) ? "(Java Closure Compiler)" : "(Node UglifyJS Compiler)") + " " + self.outFile);
                echo (sepLine);

                // minify and add any header
                header = self.extractHeader(text);
                self.compress(text, function(compressed, error){if (compressed) fs.writeFileSync(self.outFile, header + compressed, {encoding: self.enc});});
            }
            else
            {
                echo (sepLine);
                echo ("Compiling " + self.outFile);
                echo (sepLine);
                // write the processed file
                fs.writeFileSync(self.outFile, header + text, {encoding: self.enc});
            }
        }
    };

    // export it
    return self;

}).call(this);

// do the process
BuildPackage.parse();
BuildPackage.build();
