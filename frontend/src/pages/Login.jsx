/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { useEffect } from 'react';

import {
  Formik, Form, Field, ErrorMessage,
} from 'formik';
import {
  useDispatch, useSelector,
} from 'react-redux';
import { useNavigate } from 'react-router-dom';
import * as Yup from 'yup';

import { userLogin } from '../actions/actions';
import {
  CenteredFlex,
  Container,
} from '../styles';

const loginSchema = Yup.object().shape({
  email: Yup.string().email('Invalid email').required('Required'),
  password: Yup.string().min(8, 'Too Short!').max(50, 'Too Long!').required('Required'),
});

function Login() {
  const navigate = useNavigate();

  // Get states using useSelector ( state -> reducerName )
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

  // Fire actions using dispatch -> fires action -> Watcher saga handles rest
  const dispatch = useDispatch();
  const logUserIn = (values) => dispatch(userLogin(values));

  /** *******************************************************************
     * HANDLER FUNCTIONS
     ******************************************************************** */
  const handleSubmit = (values, {
    setSubmitting,
  }) => {
    setTimeout(() => {
      // eslint-disable-next-line no-undef
      alert(JSON.stringify(values, null, 2));
      setSubmitting(false);
    }, 400);

    logUserIn(values);
  };

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    } else {
      console.error('Sign up failed.');
    }
  }, [isAuthenticated]);

  return (
    <CenteredFlex minHeight="60vh">
      <Container minWidth="auto" border="1px solid grey" padding="20px">
        <h1>Login</h1>
        <Formik
          initialValues={{
            email: '',
            password: '',
          }}
          validationSchema={loginSchema}
          onSubmit={handleSubmit}
        >
          {({
            isSubmitting,
          }) => (
            <Form style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
            >
              <Container>
                <label>
                  Email:
                  {' '}
                  <Field type="email" name="email" />
                  <ErrorMessage className="error" name="email" component="div" />
                </label>
              </Container>
              <Container>
                <label>
                  Password:
                  {' '}
                  <Field type="password" name="password" />
                  <ErrorMessage className="error" name="password" component="div" />
                </label>
              </Container>
              <button type="submit" disabled={isSubmitting}>
                Submit
              </button>
            </Form>
          )}
        </Formik>

      </Container>

    </CenteredFlex>
  );
}

export default Login;
