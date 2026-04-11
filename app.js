require("dotenv").config();
const express = require("express");
const session = require("express-session"); // ✅ apenas aqui
const path = require("path");
const handlebars = require("express-handlebars");
const publicRoutes = require("./routes/publicRoutes");
const authRoutes = require("./routes/authRoutes");
const authMiddleware = require("./middlewares/authMiddleware");
const authController = require("./controllers/authController");
const conn = require("./config/db");

const app = express();

// Configuração do Handlebars
app.engine(
  "handlebars",
  handlebars.engine({
    defaultLayout: "main",
    layoutsDir: path.join(__dirname, "views/layouts"),
    partialsDir: path.join(__dirname, "views/partials"),
  })
);
app.set("view engine", "handlebars");
app.set("views", path.join(__dirname, "views"));

// Arquivos estáticos
app.use(express.static(path.join(__dirname, "assets")));

// Body parser
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ✅ Configuração da sessão (sem duplicar require)
app.set('trust proxy', 1);

app.use(session({
  secret: process.env.SESSION_SECRET || "segredo",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false
  }
}));

// Rotas públicas
app.use("/", publicRoutes);

// Rotas de autenticação
app.post("/login", authController.login);
app.post("/cadastrar", authController.register);
app.get("/logout", authController.logout);

// Rotas privadas
app.use("/", authMiddleware.checarAutenticacao, authRoutes);

module.exports = app;