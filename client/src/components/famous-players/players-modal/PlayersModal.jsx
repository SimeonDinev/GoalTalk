import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";

function PlayersModal(props) {
  console.log(props);
  return (
    <Modal
      {...props}
      size="lg"
      aria-labelledby="contained-modal-title-vcenter"
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title id="contained-modal-title-vcenter">
          {props.details.playerDetails.name}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>{props.details.playerDetails.readMore}</p>
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={props.onHide}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
}

// function App() {
//   const [modalShow, setModalShow] = React.useState(false);

//   return (
//     <>
//       <Button variant="primary" onClick={() => setModalShow(true)}>
//         Launch vertically centered modal
//       </Button>

//       <MyVerticallyCenteredModal
//         show={modalShow}
//         onHide={() => setModalShow(false)}
//       />
//     </>
//   );
// }

export default PlayersModal;

// import "./PlayersModal.css";

// const PlayersModal = ({ closeModal }) => {
//   window.onclick = function (event) {
//     if (event.target === "modal-background") {
//       modal.style.display = "none";
//     }
//   };
//   return (
//     <div className="modal-background">
//       <div className="modal-content-box">
//         <span className="Xmark" onClick={closeModal}>
//           &times;
//         </span>

//         <header>Name</header>
//         <section>
//           Lorem ipsum, dolor sit amet consectetur adipisicing elit. Vero
//           perspiciatis culpa quia tempora libero ad architecto asperiores
//           commodi repellendus quisquam odio adipisci fuga incidunt, nulla
//           doloremque soluta recusandae tenetur eos! Nemo dolor vero corrupti
//           soluta, recusandae cupiditate sit reprehenderit incidunt aliquid? A
//           incidunt asperiores hic laborum voluptatum libero excepturi accusamus!
//         </section>
//       </div>
//     </div>
//   );
// };
// export default PlayersModal;
