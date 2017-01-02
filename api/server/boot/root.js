
 module.exports = function(app) {

  var User = app.models.User;

  console.log(JSON.stringify(app));

  User.create({username: 'admin', email: 'admin@alvar.com', password: 'opensesame'}, function(err, user) {
    console.log(user);
    User.login({username: 'admin', password: 'opensesame'}, function (err, accessToken){
      console.log('access token: '+accessToken.id);
    });
  });

  var Container = app.models.container;

  Container.createContainer({name: 'fs'}, function(err, container) {
    if (err){
      if (err.errno === -17){
        console.log('Container already exists!');
      } else {
        console.error('Error create container: ', err);
      }
    } else {
      console.log(container);
    }

  });
 };
