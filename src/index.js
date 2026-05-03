import app from './app.js';
import Logger from './helpers/logger.js';

const port = process.env.PORT;

app.listen(port, () => {
    Logger.info('Server is up on port ' + port);
});