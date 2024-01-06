import Spinner from "react-bootstrap/Spinner";

function LoadingSpinner() {
  return (
    <Spinner
      animation="grow"
      variant="dark"
      role="status"
      style={{
        height: "300px",
        width: "300px",
        margin: "95px",
        marginLeft: "600px",
      }}
    ></Spinner>
  );
}

export default LoadingSpinner;
