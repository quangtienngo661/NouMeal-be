exports.success = (res, data, message, status = 200, meta) => {
  const payload = {
    success: true,
    status: status,
    data: data || null
  };

  // if (data) payload.data = data;
  if (meta) payload.meta = meta;

  return res.status(status).json(payload);
};

exports.failure = (res, err, status = 500) => {
  const payload = {
    success: false,
    error: {
      message: (err && err.message) || 'Internal Server Error',
      code: (err && (err.code || err.status)) || status,
    },
  };

  console.log(err.message);

  return res.status(status).json(payload);
};
