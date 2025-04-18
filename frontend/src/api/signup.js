import axios from 'axios';

export function signup(payload) {
  const {
    firstName, lastName, email, password,
  } = payload;
  console.log('signup API: ', payload);
  return axios.post(
    `${process.env.REACT_APP_API_BASE_URI}/authentication/signup`,
    {
      email,
      firstName,
      lastName,
      password,
    }
  );
}
