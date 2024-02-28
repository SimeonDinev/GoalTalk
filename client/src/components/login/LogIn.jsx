import useForm from "../../hooks/useForm";

import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import { Link } from "react-router-dom";

export default function LogIn({ loginSubmitHandler }) {
  const { values, onChange, onSubmit } = useForm(loginSubmitHandler, {
    email: "",
    password: "",
  });

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        background: "url(/images/dian7.jpg)",
        backgroundSize: "cover",
      }}
    >
      <Form
        onSubmit={onSubmit}
        style={{
          margin: "40px",
          padding: "17px 40px ",
          width: "30%",
          backgroundColor: "whitesmoke",
          borderRadius: "10px",
        }}
      >
        <h2 style={{ textAlign: "center" }}>Welcome</h2>
        <Form.Group className="mb-3" style={{ paddingTop: "20px" }}>
          <Form.Label>Email address</Form.Label>
          <Form.Control
            id="email"
            name="email"
            type="email"
            placeholder="Enter email"
            onChange={onChange}
            value={values.email}
          />
          <Form.Text className="text-muted">
            We'll never share your email with anyone else.
          </Form.Text>
        </Form.Group>
        <Form.Group className="mb-3" style={{ paddingTop: "7px" }}>
          <Form.Label>Password</Form.Label>
          <Form.Control
            id="password"
            name="password"
            type="password"
            placeholder="Enter Password"
            onChange={onChange}
            value={values.password}
          />
        </Form.Group>
        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Button
            variant="dark"
            type="submit"
            style={{
              marginTop: "7px",
              width: "60%",
            }}
          >
            LogIn
          </Button>
        </div>
        <p style={{ textAlign: "center", marginTop: "20px" }}>
          New to GoalTalk?{" "}
          <Link to="/registration-form" style={{ color: "black" }}>
            Join now
          </Link>
        </p>
      </Form>
    </div>
  );
}
