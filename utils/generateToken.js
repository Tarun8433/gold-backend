import jwt from 'jsonwebtoken';
import config from 'config';

const generateToken = (id) => {
  // Use config or env
  const secret = process.env.JWT_SECRET || config.get('jwtSecret');
  
  return jwt.sign({ id }, secret, {
    expiresIn: '30d',
  });
};

export default generateToken;
