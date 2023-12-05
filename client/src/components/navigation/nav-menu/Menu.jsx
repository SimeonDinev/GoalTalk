import { Link } from "react-router-dom";

import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";

import "./Menu.css";

const Menu = () => {
  return (
    <>
      <Navbar.Collapse
        id="basic-navbar-nav"
        className="d-flex justify-content-center"
      >
        <Nav
          className="me-auto d-flex justify-content-between  w-100"
          style={{ textTransform: "uppercase" }}
        >
          <Nav.Link as={Link} to="/">
            Home
          </Nav.Link>

          <Nav.Link as={Link} to="/clubs">
            Clubs
          </Nav.Link>

          <Nav.Link as={Link} to="/famous-players">
            Famous Players
          </Nav.Link>

          <Nav.Link as={Link} to="/news">
            News
          </Nav.Link>

          <Nav.Link as={Link} to="/posts">
            Posts
          </Nav.Link>
        </Nav>
      </Navbar.Collapse>
    </>
  );
};
export default Menu;
