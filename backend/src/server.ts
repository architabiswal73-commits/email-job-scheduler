import { app } from './app';
import { config } from './config/env';
import { initEmailSearch } from './services/emailSearch';

initEmailSearch()
  .then(() => {
    app.listen(config.port, () => {
      console.log(`API listening on port ${config.port}`);
    });
  })
  .catch((error) => {
    console.error('Could not initialize email search', error);
    process.exitCode = 1;
  });
