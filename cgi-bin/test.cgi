#!/usr/bin/perl

use CGI;

$q = new CGI;
$graph_structure = $q->param('graph_query');

print $q->header(-charset=>"utf-8");

print $graph_structure;

print $q->end_html;