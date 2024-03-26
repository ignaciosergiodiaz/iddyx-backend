const express =  require('express')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const _ = require('underscore')
const userController = require('./../controllers/users')

const nodemailer = require('nodemailer');

const log = require('./../utils/logger')
const User = require('./../models/Users')

const config = require('./../config')
var session = require('express-session')

const LocalStorage = require('node-localstorage').LocalStorage,
localStorage = new LocalStorage('./scratch')
const {validateUser, validateLogin}  = require('./../validation/users')

//passport 
const authJWT = require('./../libs/auth');
const passport = require('passport');
passport.use(authJWT)

const jwtAuthenticate = passport.authenticate('jwt', {session: false})

const UserRouter = express.Router()

function transformBodyToLowerCase(req, res, next) {
    req.body.username && (req.body.username = req.body.username.toLowerCase())
    req.body.email && (req.body.email = req.body.email.toLowerCase())
    next()
}
UserRouter.post('/user/signup', async (req, res) => {
  try {
    const newUser = req.body;

    // Verificar si el usuario ya existe
    const userExists = await userController.userExists(newUser.username, newUser.email);

    if (userExists) {
      return res.status(409).json("El correo ya está asociado a una cuenta");
    }

    // Hashear la contraseña del nuevo usuario
    const hash = await bcrypt.hash(newUser.password, 10);

    // Generar un token de verificación para el nuevo usuario
    const token = jwt.sign({ _id: newUser._id }, config.jwt.secret);

    // Configuración del transporte de nodemailer
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: 'ignaciosergiodiaz@gmail.com',
        pass: 'dlfopehxhpuozfwu'
      }
    });

    // Opciones del correo de verificación
    const mailOptions = {
      from: 'ignaciosergiodiaz@gmail.com',
      to: newUser.email,
      subject: 'Verificación de cuenta',
      html: `
        <p>Hola ${newUser.username},</p>
        <p>Gracias por registrarte. Por favor, haz clic en el siguiente enlace para verificar tu cuenta:</p>
        <p><a href="${config.appUrl}/verify/${token}">${config.appUrl}/verify/${token}</a></p>
        <p>Si no has solicitado una cuenta en nuestro sitio, por favor ignora este mensaje.</p>
      `,
    };

    // Envío del correo de verificación
    transporter.sendMail(mailOptions, async (error, info) => {
      if (error) {
        console.log(error);
        return res.status(500).json('Error al enviar el correo de verificación');
      } else {
        try {
          // Crear el nuevo usuario en la base de datos
          await userController.createUser(newUser, hash);
          console.log(`Usuario ${newUser.username} fue creado exitosamente`);
          // Devolver una respuesta de éxito con el token de verificación
          return res.status(201).json({ token: token });
        } catch (err) {
          console.log(err);
          return res.status(500).json('Error al crear el usuario');
        }
      }
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json('Error al crear el usuario');
  }
});


UserRouter.post('/user/signin', async (req, res) => {

    let params = req.body

    var email = params.email;
	  var password = params.password;

    let userRegistered
    let correctPassword

    try {
        userRegistered = await userController.getUser({username: params.username})
      } catch (err) {
        log.info(`Error ocurrio al tratar de determinar si el usuario ${params.username} ya existe`, err)
        res.json("Error ocurrió durante el proceso de login")
      }
    
      if (!userRegistered) {
        log.info(`Usuario [${params.username}] no existe. No pudo ser autenticado`)
      }
    
      try {
        correctPassword = await bcrypt.compare(params.password, userRegistered.password)
      } catch (err) {
        log.error(`Error ocurrió al tratar de verificar si la contraseña es correcta`, err)
      }
    
      if (correctPassword) {
    
        // GENERAR Y ENVIAR TOKEN
    
        const expiresIn = 24 * 60 * 60
        const username = req.body.username
        
        const token = jwt.sign({
          id: userRegistered.id,
          email: userRegistered.email
        }, config.jwt.secret, {expiresIn: expiresIn})

        console.log(this.token, username)

        console.log(userRegistered)
        
        log.info(`Usuario ${params.username} completo autenticación exitosamente`);
        console.log('usuario logueado exitosamente');
        res.json({token:token, username: username, dataUser: userRegistered})
    
      } else {
        log.info(`Usuario ${params.username} no completo autenticación. Contraseña Incorrecta`);
        console.log('hubo un error')
      }
})


UserRouter.get('/user/profile', jwtAuthenticate , (req, res) => {

    let user = `${req.user.username}`
    res.status(200).send(`Hola ${user} Bienvenido a iddyx `)

})

UserRouter.get('/users/logout', (req, res) => {
    
    let userAuthenticate = req.body

    req.logout();

    localStorage.removeItem('token')
    res.redirect('');

    log.info(`${userAuthenticate.username} ha salido de la aplicación`)
});

UserRouter.delete('/user/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const deletedUser = await userController.deleteUser(userId);
    res.json({ message: `Usuario ${deletedUser._id} eliminado correctamente` });
  } catch (error) {
    res.status(500).json({ error: `Error al eliminar usuario: ${error.message}` });
  }
});

UserRouter.put('/user/:userId', (req, res) => {
  const { userId } = req.params;
  const { username, password } = req.body;

  try {
    const updatedUser = userController.updateUser(userId, username, password);
    return updatedUser.then(updatedUser => {
      return res.json({ message: 'Usuario actualizado', user: updatedUser });
    }).catch(error => {
      return res.status(500).json({ error: error.message });
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});


module.exports = UserRouter
