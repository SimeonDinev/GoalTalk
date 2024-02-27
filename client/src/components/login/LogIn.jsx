import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";

export default function LogIn() {
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
        style={{
          margin: "50px",
          paddingTop: "50px",
          padding: "20px",
          marginBottom: "10.7%",
          width: "30%",
          backgroundColor: "whitesmoke",
          borderRadius: "10px",
        }}
      >
        <h2 style={{ textAlign: "center" }}>Welcome</h2>
        <Form.Group className="mb-3" controlId="formBasicEmail">
          <Form.Label>Email address</Form.Label>
          <Form.Control type="email" placeholder="Enter email" />
          <Form.Text className="text-muted">
            We'll never share your email with anyone else.
          </Form.Text>
        </Form.Group>

        <Form.Group className="mb-3" controlId="formBasicPassword">
          <Form.Label>Password</Form.Label>
          <Form.Control type="password" placeholder="Enter Password" />
        </Form.Group>

        <Button variant="dark" type="submit">
          Submit
        </Button>
      </Form>
    </div>
  );
}
