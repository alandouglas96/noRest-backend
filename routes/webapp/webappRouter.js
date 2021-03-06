const Router = require('koa-router');
const webappRouter = new Router();

const webappController = require('../../controllers/webapp/webappController');

// signup and login
webappRouter.post('/webapp/signup', webappController.signup);
webappRouter.post('/webapp/login', webappController.login);

// edit/delete a user
webappRouter.put('/webapp/user/edit', webappController.editUser);
webappRouter.delete('/webapp/user', webappController.deleteUser);

// if a user has forgotten their password
webappRouter.get('/webapp/user/forgotpassword/:email', webappController.forgotPassword);

// all other routes are protected with jwt middleware in index.js

module.exports = webappRouter;