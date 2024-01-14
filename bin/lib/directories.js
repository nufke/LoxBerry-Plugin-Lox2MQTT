const directories = () => {
  // TODO: replace paths by environment variables
  return {
    config: '/opt/loxberry/config/plugins/lox2mqtt',
    data: '/opt/loxberry/data/plugins/lox2mqtt',
    logdir: '/opt/loxberry/log/plugins/lox2mqtt',
    homedir: '/opt/loxberry',
    system_data: '/opt/loxberry/data/system',
    system_config: '/opt/loxberry/config/system',
    syslogdir: '/opt/loxberry/log/system_tmpfs',
  };
};

module.exports = directories();
