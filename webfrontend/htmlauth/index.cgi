#!/usr/bin/perl
use warnings;
use strict;
use LoxBerry::System;
use LoxBerry::Web;

my $plugintitle = "Lox2MQTT";
my $helplink = "https://wiki.loxberry.de/plugins/lox2mqtt/start";
my $helptemplate = "help.html";

my $template = HTML::Template->new(
    filename => "$lbptemplatedir/settings.html",
    global_vars => 1,
    loop_context_vars => 1,
    die_on_bad_params => 0,
);

LoxBerry::Web::lbheader($plugintitle, $helplink, $helptemplate);

print $template->output();

LoxBerry::Web::lbfooter();