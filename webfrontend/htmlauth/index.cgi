#!/usr/bin/perl
use warnings;
use strict;
use LoxBerry::System;
use LoxBerry::Web;

my $plugintitle = "Lox2MQTT";
my $helplink = "https://wiki.loxberry.de/plugins/lox2mqtt/start";
my $helptemplate = "help.html";

# Template
my $template = HTML::Template->new(
    filename => "$lbptemplatedir/settings.html",
    global_vars => 1,
    loop_context_vars => 1,
    die_on_bad_params => 0,
);

# Navbar
our %navbar;
$navbar{1}{Name} = "Settings";
$navbar{1}{URL} = "index.cgi";
$navbar{99}{Name} = "Logfile";
$navbar{99}{URL} = "/admin/system/tools/logfile.cgi?logfile=".$lbplogdir."/lox2mqtt.log&header=html&format=template&only=once";
$navbar{1}{active} = 1;

# Template Vars and Form parts
$template->param("LBPPLUGINDIR", $lbpplugindir);

# Template
LoxBerry::Web::lbheader($plugintitle, $helplink, $helptemplate);
print $template->output();
LoxBerry::Web::lbfooter();

exit;