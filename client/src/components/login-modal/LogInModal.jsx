import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";

function LogInModal(props) {
  return (
    <>
      <Modal
        show={props.show}
        onHide={props.close}
        style={{ paddingRight: "0px" }}
      >
        <Modal.Header closeButton>
          <Modal.Title>Log-In</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3" controlId="formBasicEmail">
              <Form.Label>Email address</Form.Label>
              <Form.Control type="email" placeholder="Enter email" />
              <Form.Text className="text-muted">
                We'll never share your email with anyone else.
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3" controlId="formBasicPassword">
              <Form.Label>Password</Form.Label>
              <Form.Control type="password" placeholder="Password" />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer
          style={{ display: "flex", justifyContent: "space-between" }}
        >
          <Form.Text className="text-muted">
            Don't have an account yet? <a href="">Sign up</a>
          </Form.Text>
          <Button variant="primary" type="submit" style={{ width: "100px" }}>
            Sign in
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default LogInModal;
