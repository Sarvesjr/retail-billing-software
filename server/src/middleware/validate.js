export const validate = (schema) => async (req, res, next) => {
  try {
    req.body = await schema.parseAsync(req.body);
    next();
  } catch (error) {
    next(error);
  }
};

export const validateQuery = (schema) => async (req, res, next) => {
  try {
    req.query = await schema.parseAsync(req.query);
    next();
  } catch (error) {
    next(error);
  }
};

