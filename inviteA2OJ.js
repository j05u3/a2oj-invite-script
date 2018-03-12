"use strict";

var users = ["gsalvadorr", "kjneciosup", "KO_Var", "samirharry", "erosjbc", "Valent", "cristhian3798", "sandro_castillo_751", "carlos.ar", "jrojas111", "leonardo19022001", "JrAlf", "JotFe", "PauloCS", "Blessed1202", "brunoluyauni", "skadrock", "Datero300", "gsparrow"];

var fs = require('fs');
var page = require('webpage').create();
var utils = require('./util.js');

var debug = true;

// parameters
page.settings.userAgent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36';
page.settings.loadImages = debug;
page.settings.resourceTimeout = 30000; // in millis
page.onResourceTimeout = function(e) {
  console.log(JSON.stringify({"STATUS": "RESOURCE_TIMEOUT"}));  
  //console.log(e.errorCode);   // it'll probably be 408 
  //console.log(e.errorString); // it'll probably be 'Network timeout on resource'
  //console.log(e.url);         // the url whose request timed out
  phantom.exit();
};

setTimeout(function() {
        console.log(JSON.stringify({"STATUS": "WHOLE_SCRIPT_TIMEOUT"}));
        phantom.exit();
}, 2*60*1000); // two minutes timeout

var credentials = {user: "", pass: ""};
var contestId = ""; // contest id

var system = require('system');
var args = system.args.slice(1);

for (var ind = 0; ind < args.length ;ind += 2) {
    if (ind + 1 >= args.length) {
        console.log(JSON.stringify({"STATUS": "INCOMPLETE_COMMAND_LINE_ARGUMENT"}));
        phantom.exit();
    }
    if (args[ind] === "-a") {
        page.settings.userAgent = args[ind + 1];
    } else if (args[ind] === "-u") {
        credentials.user = args[ind + 1];
    } else if (args[ind] === "-p") {
        credentials.pass = args[ind + 1];
    } else if (args[ind] === "-c") {
        contestId = args[ind + 1];
    }
}

if (credentials.user.length === 0) {
    console.log(JSON.stringify({"STATUS": "NO_USER_SPECIFIED"}));
    phantom.exit();
}

if (credentials.pass.length === 0) {
    console.log(JSON.stringify({"STATUS": "NO_PASSWORD_SPECIFIED"}));
    phantom.exit();
}

if (contestId.length === 0) {
    console.log(JSON.stringify({"STATUS": "NO_CONTEST_ID_SPECIFIED"}));
    phantom.exit();
}

page.open("https://a2oj.com/signin?url=%2F", function (status) {

    // Check for page load success
    if (status !== "success") {
        console.log(JSON.stringify({"STATUS": "UNABLE_TO_ACCESS_NETWORK"}));
        phantom.exit();
    } else {
        if (debug) {
            page.render('step01_page_load_success.png');
            fs.write("step01.html", page.content, 'w');
        }

        utils.waitFor(function () {
            // Check in the page if a specific element is now visible
            return page.evaluate(function () {
                try {
                    return $("input[type=submit]").is(":visible");
                } catch (e) {
                    return false;
                }
            });
        }, function () {
            if (debug) {
                page.render('step02_Signin_button_visible.png');
                fs.write("step02.html", page.content, 'w');
            }
            page.evaluate(function (credentials) {
                $("input[name=Username]").val(credentials.user);
                $("input[name=Password]").val(credentials.pass);
                $("input[type=submit]").click();
            }, credentials);

            utils.waitFor(function () {
                return page.evaluate(function () {
                    try {
                        return $('a[href="account"]').is(":visible");
                    } catch (e) {
                        return false;
                    }
                });
            }, function () {
                if (debug) {
                    page.render('step03_LoggedIn.png');
                    fs.write("step03.html", page.content, 'w');
                }
                page = require('webpage').create();
                page.open("https://a2oj.com/invite?ID=" + contestId, function(status) {
                    if (status !== "success") {
                        console.log(JSON.stringify({"STATUS": "UNABLE_TO_ACCESS_NETWORK"}));
                        phantom.exit();
                    } else {
                        if (debug) {
                            page.render('step04_page_load_success.png');
                            fs.write("step04.html", page.content, 'w');
                        }
                        utils.waitFor(function () {
                            return page.evaluate(function () {
                                try {
                                    return $('input[value="Invite User"]').is(":visible");
                                } catch (e) {
                                    return false;
                                }
                            });
                        }, function () {
                            if (debug) {
                                page.render('step05_invite_button_visible.png');
                                fs.write("step05.html", page.content, 'w');
                            }

                            function recursiveInvitation(users, i) {
                                if (i == users.length) return;
                                var userid = users[i];
                                page.evaluate(function (userid) {
                                    $("#Username").val(userid);
                                    $('input[value="Invite User"]').click();
                                }, userid);

                                utils.waitFor(function () {
                                    return page.evaluate(function () {
                                        try {
                                            return $('input[value="Invite User"]').is(":visible");
                                        } catch (e) {
                                            return false;
                                        }
                                    });
                                }, function () {
                                    if (debug) {
                                        page.render('step06_invited_' + userid + '.png');
                                        fs.write('step06' + userid + '.html', page.content, 'w');
                                    }
                                    recursiveInvitation(users, i + 1);
                                });
                            }

                            recursiveInvitation(users, 0);
                        });
                    }
                });
            });
        });
    }
});