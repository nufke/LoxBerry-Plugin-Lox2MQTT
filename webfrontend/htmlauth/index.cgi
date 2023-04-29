#!/usr/bin/perl
use warnings;
use strict;
use LoxBerry::System;
use LoxBerry::Web;
use CGI;
use warnings;
use strict;
my $load="";

# Variables
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

# Parameters
# Import form parameters to the namespace R
my $cgi = CGI->new;
$cgi->import_names('R');
# Example: Parameter lang is now $R::lang
$load = $R::load if $R::load;

# Navbar
our %navbar;
$navbar{1}{Name} = "Settings";
$navbar{1}{URL} = "index.cgi";
$navbar{99}{Name} = "Logfiles";
$navbar{99}{URL} = "index.cgi?load=2";

# Menu
if (!$R::saveformdata && $load eq "2") {
  $navbar{99}{active} = 1;
  &form;
} elsif (!$R::saveformdata) {
  $navbar{1}{active} = 1;
  &form;
} else {
  &save;
}

exit;

# Form / menu
sub form {
  if ($load eq "2") {
    $template->param( "FORM2", 1);
    $template->param('loglist_html', LoxBerry::Web::loglist_html( PACKAGE => 'lox2mqtt' ))
  } else {
    $template->param( "FORM1", 1);
  }

  # Print Template
  LoxBerry::Web::lbheader($plugintitle, $helplink, $helptemplate);
  print $template->output();
  LoxBerry::Web::lbfooter();
  exit;
}