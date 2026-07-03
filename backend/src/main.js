const app = require('./app');
const config = require('./config/config');

app.listen(config.port, () => {
  console.log('');
  console.log('Albion Market API');
  console.log(`  Server:  http://localhost:${config.port}`);
  console.log(`  Docs:    http://localhost:${config.port}/docs`);
  console.log(`  Health:  http://localhost:${config.port}/health`);
  console.log(`  Albion:  ${config.baseUrl}`);
  console.log('');
});
