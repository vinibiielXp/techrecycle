const bcrypt = require("bcryptjs");
const conn = require("../config/db");

// Controller de autenticação
exports.login = (req, res) => {
  const { email, password } = req.body;

  const sql = "SELECT * FROM usuarios WHERE email = ?";
  conn.query(sql, [email], (err, results) => {
    if (err) {
      return res.status(500).json({ sucesso: false, mensagem: "Erro interno no servidor." });
    }

    if (results.length === 0) {
      return res.redirect("/login?erro=credenciais");
    }

    const usuario = results[0];

    // Verificar senha
    bcrypt.compare(password, usuario.senha, (err, isMatch) => {
      if (err) {
        return res.status(500).json({ sucesso: false, mensagem: "Erro interno no servidor." });
      }
      if (!isMatch) {
        return res.redirect("/login?erro=credenciais");
      }

      req.session.usuario = {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
      };
      return res.redirect("/principal");
    });
  });
};

exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ sucesso: false, mensagem: "Erro ao sair" });
    }
    res.status(200).json({ sucesso: true, mensagem: "Logout realizado com sucesso!", redirectUrl: "/login" });
  });
};

exports.excluirConta = (req, res) => {
  const userId = req.session.usuario.id;

  const deletarDispositivos = `
    DELETE FROM Dispositivo 
    WHERE coleta_id IN (
      SELECT id FROM Coleta WHERE usuario_id = ?
    )`;

  conn.query(deletarDispositivos, [userId], (err) => {
    if (err) return res.status(500).json({ sucesso: false });

    const deletarColetas = `DELETE FROM Coleta WHERE usuario_id = ?`;
    conn.query(deletarColetas, [userId], (err) => {
      if (err) return res.status(500).json({ sucesso: false });

      const deletarUsuario = `DELETE FROM usuarios WHERE id = ?`;
      conn.query(deletarUsuario, [userId], (err) => {
        if (err) return res.status(500).json({ sucesso: false });

        req.session.destroy(() => {
          res.json({ sucesso: true });
        });
      });
    });
  });
};

exports.register = (req, res) => {
  const { nome, email, senha } = req.body;

  // Verifica se o e-mail já existe
  const checkEmailSql = "SELECT * FROM usuarios WHERE email = ?";
  conn.query(checkEmailSql, [email], (err, results) => {
    if (err) {
      return res.status(500).json({ sucesso: false, mensagem: "Erro interno" });
    }

    if (results.length > 0) {
  return res.redirect("/cadastrar?erro=email");
}

    // Criptografar senha
    bcrypt.hash(senha, 10, (err, hashedPassword) => {
      if (err) {
        return res.status(500).json({ sucesso: false, mensagem: "Erro ao cadastrar" });
      }

      const insertSql = "INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)";
      conn.query(insertSql, [nome, email, hashedPassword], (err, result) => {
        if (err) {
          return res.status(500).json({ sucesso: false, mensagem: "Erro ao cadastrar" });
        }

        return res.redirect("/login");
      });
    });
  });
};

