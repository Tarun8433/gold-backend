import { z } from 'zod';

const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (err) {
    if (err instanceof z.ZodError) {
      const issues = err.issues ?? err.errors ?? [];
      return res.status(400).json({
        message: 'Validation error',
        errors: issues.map((e) => ({
          message: e.message,
          path: e.path,
        })),
      });
    }
    return res.status(500).send('Internal Server Error');
  }
};

export default validate;
