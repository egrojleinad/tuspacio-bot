// TuSpacio Salon WhatsApp Bot
// Autor base: Jorge Colmenares
// Adaptación completa para salón de belleza por ZAPIKEY AI

require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const app = express();
const port = 4040;

console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID);

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappFrom = process.env.TWILIO_WHATSAPP_NUMBER;
const notifyTo = 'whatsapp:+51986040443';

const twilioClient = twilio(accountSid, authToken);
app.use(bodyParser.urlencoded({ extended: false }));

const clients = {};
const timeouts = {};

const showMainMenu = () => (
`*Bienvenid@ a TuSpacio Salon* 
Por favor, elige una de las siguientes opciones:
1. 💇‍♀️ Agendar una cita para *Cabello*
2. 💅 Agendar una cita para *Uñas*
3. 📋 Ver listado de *servicios y precios*
4. 💬 Hablar con una *asesora*
5. 🕒 Consultar *horarios* del salón
6. 📍 Ver *dirección* del salón
7. 💳 Número de cuenta *para transferencias*
8. 📱 Número de celular *para SINPE*
0. ❌ Terminar la sesión

📝 En cualquier momento, escribe 0 para volver al Menú Principal.`
);

const submenuCabello = () => (
`💇‍♀️ *Agendar una cita para cabello*
1️⃣ Corte de cabello ✂️
2️⃣ Tinte, decoloración o similares 🎨
3️⃣ Tratamiento especial 💆‍♀️

0️⃣ Volver al Menú Principal`
);

const submenuUnas = () => (
`💅 *Agendar una cita para Uñas*
1️⃣ Manos 💅
2️⃣ Pies 🦶
3️⃣ Manos y Pies 💅🦶

0️⃣ Volver al Menú Principal`
);

const returnToMainMenu = (client, twiml) => {
  client.step = 'menu';
  client.awaitingMenu = false;
  twiml.message(showMainMenu());
  setInactivityTimeout(client, client.phone);
};

const notifySalon = async ({ nombre, telefono, fecha, hora, servicio, detalle = '' }) => {
  const mensaje = `📌 *Nueva solicitud de cita:*
👤 *Nombre:* ${nombre}
📱 *Teléfono:* ${telefono}
📅 *Fecha:* ${fecha}
🕐 *Hora:* ${hora}
💼 *Servicio:* ${servicio}${detalle ? `
📝 *Detalle:* ${detalle}` : ''}`;
  console.log('Enviando a WhatsApp:', mensaje);
  await twilioClient.messages.create({ body: mensaje, from: whatsappFrom, to: notifyTo });
  console.log('✅ Mensaje enviado al salón con éxito');
};

const setInactivityTimeout = (client, from) => {
  if (timeouts[from]) clearTimeout(timeouts[from]);
  timeouts[from] = setTimeout(() => {
    delete clients[from];
    twilioClient.messages.create({
      from: whatsappFrom,
      to: from,
      body: `⌛ Hemos cerrado la sesión por inactividad. ¡Gracias por contactarnos! 🙏`
    });
  }, 120000); // 2 minutos
};

const endSession = (client, twiml, from) => {
  const farewell = `🙏 Agradecemos elegir TuSpacio Salon. Te esperamos pronto. Si tienes algo que comentarnos para seguir mejorando, por favor, escribe aquí:
✏️ *Escribe tu comentario o sugerencia ahora.*
🛑 *Escribe 0 si no deseas enviar ningún comentario.*`;
  client.step = 'end_feedback';
  twiml.message(farewell);
};

app.post('/webhook', async (req, res) => {
  const twiml = new twilio.twiml.MessagingResponse();
  const from = req.body.From;
  const msg = req.body.Body.trim();

  if (!clients[from]) {
    clients[from] = { step: 'ask_name', name: '', temp: {}, phone: from };
    twiml.message('👋 ¡Hola! Bienvenid@ a *TuSpacio Salon*. ¿Podrías decirme tu nombre para empezar?');
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml.toString());
    return;
  }

  const client = clients[from];
  setInactivityTimeout(client, from);

  if (client.step === 'awaiting_menu') {
    client.step = 'menu';
    client.awaitingMenu = false;
    twiml.message(showMainMenu());
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml.toString());
    return;
  }

  if (client.step === 'ask_name') {
    client.name = msg;
    client.step = 'menu';
    client.awaitingMenu = true;
    twiml.message(`¡Gracias, ${client.name}!`);
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml.toString());
    return;
  }

  if (msg === '0') {
    endSession(client, twiml, from);
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml.toString());
    return;
  }

  switch (client.step) {
    case 'menu':
      switch (msg) {
        case '1': client.step = 'cabello_menu'; twiml.message(submenuCabello()); break;
        case '2': client.step = 'unas_menu'; twiml.message(submenuUnas()); break;
        case '3': twiml.message('📋 Lista de precios: https://example.com/servicios'); client.awaitingMenu = true; break;
        case '4': {
          const now = new Date();
          const fecha = now.toLocaleDateString('es-CR');
          const hora = now.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
          await notifySalon({ nombre: client.name, telefono: from, fecha, hora, servicio: 'Asesoría directa' });
          twiml.message('💬 Pronto te pondremos en contacto con una asesora. Si no respondemos, llama al 📞 7229 7263');
          client.awaitingMenu = true;
          client.step = 'awaiting_menu';
          break;
        }

        case '5': twiml.message('🕒 Horarios: https://example.com/horarios'); client.awaitingMenu = true; break;
        case '6': twiml.message('📍 Dirección: Cartago, El Guarco. Waze: https://waze.com/aaaaa'); client.awaitingMenu = true; break;
        case '7': twiml.message('💳 Cuenta BAC: CRlflfkkfkfk\nEnvía el comprobante a WhatsApp 7229 7263.'); client.awaitingMenu = true; break;
        case '8': twiml.message('📱 SINPE móvil: 7229 7263\nEnvía el comprobante con tu nombre y servicio.'); client.awaitingMenu = true; break;
        default: twiml.message('❗ Opción no válida.'); client.awaitingMenu = true;
      }
      break;

    case 'cabello_menu':
      if (['1', '2', '3'].includes(msg)) {
        client.temp.servicio = ['Corte de cabello ✂️', 'Tinte o decoloración 🎨', 'Tratamiento especial 💆‍♀️'][parseInt(msg) - 1];
        client.step = 'cabello_fecha';
        twiml.message('📅 ¿En qué fecha desea el servicio?');
      } else {
        twiml.message('❗ Opción inválida.'); twiml.message(submenuCabello());
      }
      break;

    case 'cabello_fecha':
      client.temp.fecha = msg;
      client.step = 'cabello_hora';
      twiml.message('🕐 ¿En qué horario?');
      break;

    case 'cabello_hora':
      client.temp.hora = msg;
      if (client.temp.servicio.includes('Tratamiento especial')) {
        client.step = 'cabello_detalle';
        twiml.message('📝 Por favor, especifica qué tratamiento deseas.');
      } else {
        await notifySalon({ nombre: client.name, telefono: from, ...client.temp });
        twiml.message('✅ Nos comunicaremos pronto con usted para confirmar la cita.');
        client.awaitingMenu = true;
        client.step = 'awaiting_menu';
      }
      break;

    case 'cabello_detalle':
      client.temp.detalle = msg;
      await notifySalon({ nombre: client.name, telefono: from, ...client.temp });
      twiml.message('✅ Nos comunicaremos pronto con usted para confirmar la cita.');
      client.awaitingMenu = true;
      client.step = 'awaiting_menu';
      break;

    case 'unas_menu':
      if (['1', '2', '3'].includes(msg)) {
        client.temp.servicio = ['Uñas - Manos 💅', 'Uñas - Pies 🦶', 'Uñas - Manos y Pies 💅🦶'][parseInt(msg) - 1];
        client.step = 'unas_fecha';
        twiml.message('📅 ¿En qué fecha desea el servicio?');
      } else {
        twiml.message('❗ Opción inválida.'); twiml.message(submenuUnas());
      }
      break;

    case 'unas_fecha':
      client.temp.fecha = msg;
      client.step = 'unas_hora';
      twiml.message('🕐 ¿En qué horario?');
      break;

    case 'unas_hora':
      client.temp.hora = msg;
      if (client.temp.servicio.includes('Manos y Pies')) {
        client.step = 'unas_detalle';
        twiml.message('📝 Por favor, especifica qué tratamiento deseas.');
      } else {
        await notifySalon({ nombre: client.name, telefono: from, ...client.temp });
        twiml.message('✅ Nos comunicaremos pronto con usted para confirmar la cita.');
        client.awaitingMenu = true;
        client.step = 'awaiting_menu';
      }
      break;

    case 'unas_detalle':
      client.temp.detalle = msg;
      await notifySalon({ nombre: client.name, telefono: from, ...client.temp });
      twiml.message('✅ Nos comunicaremos pronto con usted para confirmar la cita.');
      client.awaitingMenu = true;
      client.step = 'awaiting_menu';
      break;

    case 'end_feedback':
      if (msg !== '0') {
        const now = new Date();
        const fechaHoy = now.toLocaleDateString('es-CR');
        const horaAhora = now.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
        await notifySalon({ nombre: client.name, telefono: from, fecha: fechaHoy, hora: horaAhora, servicio: 'Comentario Final', detalle: msg });
        twiml.message('🙏 ¡Gracias por tu comentario! Te esperamos pronto en TuSpacio Salon.');
      } else {
        twiml.message('🚫 Comentario cancelado. ¡Te esperamos pronto en TuSpacio Salon!');
      }
      delete clients[from];
      break;
  }

  res.writeHead(200, { 'Content-Type': 'text/xml' });
  res.end(twiml.toString());
});

app.listen(port, () => {
  console.log(`🚀 TuSpacio Salon Bot ejecutándose en http://localhost:${port}`);
});
