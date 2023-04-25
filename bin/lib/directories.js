const directories = () => {
  // TODO: replace paths by environment variables
  return {
    config: '/opt/loxberry/config/plugins/lox2mqtt',
    data: '/opt/loxberry/data/plugins/lox2mqtt',
    logdir: '/opt/loxberry/log/plugins/lox2mqtt',
    homedir: '/opt/loxberry',
    systemData: '/opt/loxberry/data/system'
  };
}

module.exports = directories();
