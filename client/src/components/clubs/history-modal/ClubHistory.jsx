import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import * as service from "../../../services/clubService";

import { Container } from "react-bootstrap";
import "./ClubHistory.css";

function ClubHistory() {
  const [clubImg, setClubImg] = useState({});
  const [club, setClub] = useState([]);
  const { clubId } = useParams();

  useEffect(() => {
    service.getDetails(clubId).then(setClub);
  }, [clubId]);

  useEffect(() => {
    service.getOne(clubId).then((res) => setClubImg(res.imageUrl));
  }, [clubId]);

  return (
    <Container id="details-container" fluid>
      <h1 style={{ textAlign: "center", marginTop: "40px" }}>
        <span>
          <img
            src={clubImg}
            alt="club logo"
            style={{ height: "90px", width: "90px", marginRight: "50px" }}
          />
        </span>
        {club.clubName}
        <span>
          <img
            src={clubImg}
            alt="club logo"
            style={{ height: "90px", width: "90px", marginLeft: "50px" }}
          />
        </span>
      </h1>
      <div
        style={{
          textAlign: "center",
          padding: "0px 100px",
          margin: "22px 0px",
          fontSize: "19px",
          fontWeight: "500",
        }}
      >
        <h1>{club.introduction}</h1>
      </div>
    </Container>
  );
}

export default ClubHistory;