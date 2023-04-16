<?php

require_once "loxberry_system.php";

header('Content-Type: application/json; charset=UTF-8');

/* If started from the command line, wrap parameters to $_POST and $_GET */
if (!isset($_SERVER["HTTP_HOST"])) {
	parse_str($argv[1], $_POST);
}

$ajax = !empty($_POST['ajax']) ? $_POST['ajax'] : "";
$ajax = empty($ajax) ? $_GET['ajax'] : $ajax;

if ($ajax == 'restart_lox2mqtt') {
	print "restart_lox2mqtt...";
	exec("cd $lbhomedir/bin/plugins/lox2mqtt; npm run stop; sleep 1; npm run start");
}

elseif ( $ajax == 'get_lox2mqtt_pid' ) {
	$data['pid'] = trim(`pgrep Lox2MQTT`) ;
	$data['pid'] = $data['pid'] != 0 ? $data['pid'] : null;
	echo json_encode( $data['pid'] );
}

// Unknown request
else {
	http_response_code(500);
	if (empty($ajax)) {
		error_log("ajax-lox2mqtt-handler.php: ERRROR: ajax not set.");
	} else {
		error_log("ajax-lox2mqtt-handler: ERRROR: ajax=$ajax is unknown.");
	}
}

?>