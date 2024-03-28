const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const userController = require('./../controllers/users');
const winston = require('winston');
const config = require('./../config');
const authJWT = require('./../libs/auth');
const passport = require('passport');

const jwtAuthenticate = passport.authenticate('jwt', { session: false });

const UserRouter = express.Router();
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
        user: 'ignaciosergiodiaz@gmail.com',
        pass: 'qyvk jvvf djhv xosi'
    }
});

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.simple(),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logfile.log' })
    ]
});

function transformBodyToLowerCase(req, res, next) {
    req.body.username && (req.body.username = req.body.username.toLowerCase());
    req.body.email && (req.body.email = req.body.email.toLowerCase());
    next();
}
// POST: User Signup
UserRouter.post('/user/signup', async (req, res) => {
    try {
        const newUser = req.body;

        // Check if the user already exists
        const userExists = await userController.userExists(newUser.username, newUser.email);

        if (userExists) {
            return res.status(409).json("El correo ya está asociado a una cuenta");
        }

        // Hash the new user's password
        const hash = await bcrypt.hash(newUser.password, 10);

        // Generate a verification token for the new user
        const token = jwt.sign({ _id: newUser._id }, config.jwt.secret);

        // Verification email options
        const mailOptions = {
            from: 'Leo Dupont de iddux',
            to: newUser.email,
            subject: 'Verificación de cuenta',
            html: `
                <style>
                    .bounce {
                        animation: bounce 1s infinite alternate;
                    }

                    @keyframes bounce {
                        0% {
                            transform: translateY(0);
                        }
                        100% {
                            transform: translateY(-5px);
                        }
                    }
                </style>
                <p style="font-size: 18px;">¡Hola ${newUser.username}!</p>
                <p style="font-size: 16px;">Gracias por registrarte en iddux.</p>
                <p style="font-size: 16px;">Haz clic en el siguiente botón para verificar tu cuenta:</p>
                <a href="http://iddux.cl/#/signin" style="display: inline-block; background-color: #007bff; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-size: 16px;">Verificar cuenta</a>
                <p style="font-size: 16px;">Si no has solicitado una cuenta en nuestro sitio, por favor ignora este mensaje.</p>
                <img src="https://url_de_tu_imagen" alt="iddux_logo" style="display: block; margin: 20px auto;">
                <p style="font-size: 16px;">🎉 ¡Esperamos que disfrutes de nuestra plataforma! 🚀</p>
                <p style="font-size: 16px;">😊 ¡Y no olvides seguirnos en nuestras redes sociales para estar al tanto de todas las novedades! 📱</p>
                <p style="font-size: 16px;" class="bounce">💃 ¡A bailar con iddux! 🎶</p>
            `,
        };

        // Send verification email
        transporter.sendMail(mailOptions, async (error, info) => {
            if (error) {
                logger.error('Error al enviar el correo de verificación', error);
                return res.status(500).json('Error al enviar el correo de verificación');
            } else {
                try {
                    // Create the new user in the database
                    await userController.createUser(newUser, hash);
                    logger.info(`Usuario ${newUser.username} fue creado exitosamente`);
    
                } catch (err) {
                    logger.error('Error al crear el usuario', err);
                    return res.status(500).json('Error al crear el usuario');
                }
            }
        });
    } catch (err) {
        logger.error('Error al crear el usuario', err);
        return res.status(500).json('Error al crear el usuario');
    }
});
// GET: User Profile
UserRouter.get('/user/profile', jwtAuthenticate, (req, res) => {
    let user = `${req.user.username}`;
    res.status(200).send(`Hola ${user} Bienvenido a iddyx `);
});

// GET: User Logout
UserRouter.get('/users/logout', (req, res) => {
    let userAuthenticate = req.body;
    req.logout();
    localStorage.removeItem('token');
    res.redirect('');
    logger.info(`${userAuthenticate.username} ha salido de la aplicación`);
});

// DELETE: User by ID
UserRouter.delete('/user/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const deletedUser = await userController.deleteUser(userId);
        res.json({ message: `Usuario ${deletedUser._id} eliminado correctamente` });
    } catch (error) {
        logger.error(`Error al eliminar usuario: ${error.message}`);
        res.status(500).json({ error: `Error al eliminar usuario: ${error.message}` });
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


// PUT: Update User
UserRouter.put('/user/:userId', (req, res) => {
    const { userId } = req.params;
    const { username, password } = req.body;

    try {
        const updatedUser = userController.updateUser(userId, username, password);
        return updatedUser.then(updatedUser => {
            return res.json({ message: 'Usuario actualizado', user: updatedUser });
        }).catch(error => {
            logger.error(`Error al actualizar usuario: ${error.message}`);
            return res.status(500).json({ error: error.message });
        });
    } catch (error) {
        logger.error(`Error al actualizar usuario: ${error.message}`);
        return res.status(500).json({ error: error.message });
    }
});

module.exports = UserRouter;
