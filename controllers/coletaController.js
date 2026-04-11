const conn = require("../config/db");

// ================= AGENDAR COLETA =================
exports.agendarColeta = async (req, res) => {
  const { data, material, local, peso, observacao } = req.body;
  const idUsuario = req.session?.usuario?.id;

  if (!idUsuario) {
    return res.status(401).json({
      sucesso: false,
      mensagem: 'Usuário não autenticado.',
    });
  }

  try {
    const dataFormatada = data.substring(0, 10);

    const [resultado] = await conn.promise().query(
      `INSERT INTO Coleta (data, material, local, peso, observacao, usuario_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [dataFormatada, material, local, peso, observacao, idUsuario]
    );

    const idColeta = resultado.insertId;

    await conn.promise().query(
      `INSERT INTO Dispositivo (tipo, coleta_id, usuario_id, peso)
       VALUES (?, ?, ?, ?)`,
      [material, idColeta, idUsuario, peso]
    );

    return res.json({
      sucesso: true,
      agendamento: {
        id: idColeta,
        data: dataFormatada,
        material,
        local,
        peso,
        observacao,
        usuario_id: idUsuario,
      },
    });

  } catch (error) {
    console.error('Erro ao agendar coleta:', error);
    return res.status(500).json({
      sucesso: false,
      mensagem: 'Erro interno ao tentar agendar coleta.',
    });
  }
};

// ================= CANCELAR COLETA =================
exports.cancelarColeta = async (req, res) => {
  try {
    const { idColeta } = req.body;

    if (!idColeta || isNaN(idColeta)) {
      return res.status(400).json({ sucesso: false, mensagem: 'ID inválido' });
    }

    const idUsuario = req.session?.usuario?.id;
    if (!idUsuario) {
      return res.status(401).json({ sucesso: false, mensagem: 'Não autenticado' });
    }

    const [coletaCheck] = await conn.promise().query(
      'SELECT * FROM Coleta WHERE id = ?',
      [idColeta]
    );

    if (coletaCheck.length === 0) {
      return res.status(404).json({ sucesso: false, mensagem: 'Coleta não encontrada' });
    }

    const coleta = coletaCheck[0];

    if (coleta.usuario_id !== idUsuario) {
      return res.status(403).json({ sucesso: false, mensagem: 'Sem permissão' });
    }

    // 🔥 REMOVE TRANSACTION (causa do erro)

    await conn.promise().query(
      'DELETE FROM Dispositivo WHERE coleta_id = ?',
      [idColeta]
    );

    await conn.promise().query(
      'DELETE FROM Coleta WHERE id = ?',
      [idColeta]
    );

    return res.json({
      sucesso: true,
      mensagem: 'Coleta cancelada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao cancelar:', error);
    return res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao cancelar coleta'
    });
  }
};

// ================= BUSCAR UMA COLETA =================
exports.buscarAgendamento = async (req, res) => {
  try {
    const idColeta = req.query.idColeta;

    const [rows] = await conn.promise().query(
      'SELECT * FROM Coleta WHERE id = ?',
      [idColeta]
    );

    const agendamento = rows[0];

    if (!agendamento) {
      return res.render('auth/minhas-coletas', { agendamento: null });
    }

    const dataStr = agendamento.data.toISOString().substring(0, 10);
    const [ano, mes, dia] = dataStr.split('-');

    agendamento.dataExibicao = `${dia}/${mes}/${ano}`;

    res.render('auth/minhas-coletas', { agendamento });

  } catch (error) {
    console.error(error);
    res.render('auth/minhas-coletas', { agendamento: null });
  }
};

// ================= BUSCAR TODAS =================
exports.buscarAgendamentosAPI = async (req, res) => {
  try {
    const idUsuario = req.session?.usuario?.id;

    if (!idUsuario) {
      return res.json({ sucesso: false });
    }

    const [rows] = await conn.promise().query(
      'SELECT * FROM Coleta WHERE usuario_id = ? ORDER BY data DESC',
      [idUsuario]
    );

    rows.forEach(c => {
      const dataStr = c.data.toISOString().substring(0, 10);
      const [ano, mes, dia] = dataStr.split('-');

      c.dataExibicao = `${dia}/${mes}/${ano}`;
    });

    res.json({
      sucesso: true,
      agendamentos: rows
    });

  } catch (error) {
    console.error(error);
    res.json({ sucesso: false });
  }
};

// ================= REAGENDAR =================
exports.reagendarColeta = async (req, res) => {
  try {
    const { idColeta, novaData, material, peso, observacao } = req.body;
    const idUsuario = req.session?.usuario?.id;

    if (!idUsuario) {
      return res.status(401).json({ sucesso: false, mensagem: "Não autenticado" });
    }

    if (!idColeta || !novaData) {
      return res.status(400).json({ sucesso: false, mensagem: "Dados incompletos" });
    }

    const [check] = await conn.promise().query(
      'SELECT * FROM Coleta WHERE id = ?',
      [idColeta]
    );

    if (check.length === 0) {
      return res.status(404).json({ sucesso: false, mensagem: "Coleta não encontrada" });
    }

    if (check[0].usuario_id !== idUsuario) {
      return res.status(403).json({ sucesso: false, mensagem: "Sem permissão" });
    }

    await conn.promise().query(
      `UPDATE Coleta 
       SET data = ?, material = ?, peso = ?, observacao = ?
       WHERE id = ?`,
      [novaData, material, peso, observacao, idColeta]
    );

    return res.json({ sucesso: true });

  } catch (error) {
    console.error("Erro ao reagendar:", error);
    return res.status(500).json({ sucesso: false, mensagem: "Erro ao reagendar" });
  }
};