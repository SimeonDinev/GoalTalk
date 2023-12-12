import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import * as service from "../../../services/clubService";

import { Container, Card } from "react-bootstrap";
import "./ClubHistory.css";

function ClubHistory() {
  const [club, setClub] = useState({});
  const [clubDetails, setClubDetails] = useState([]);
  const { clubId } = useParams();

  useEffect(() => {
    service.getDetails(clubId).then(setClubDetails);
  }, [clubId]);

  useEffect(() => {
    service.getOne(clubId).then(setClub);
  }, [clubId]);

  useEffect(() => {
    // Scroll to the top when the component mounts
    window.scroll(0, 0);
  }, []);

  return (
    <Container id="details-container" fluid>
      <h1 id="heading-of-the-team">
        <span>
          <img src={club.imageUrl} alt="club logo" className="logo-img" />
        </span>
        {clubDetails.clubName}
        <span>
          <img src={club.imageUrl} alt="club logo" className="logo-img" />
        </span>
      </h1>

      <div className="card-history-container">
        <Card id="history-card">
          <Card.Body id="history-card-body-background">
            <Card.Title id="card-history-heading">Introduction</Card.Title>
            <Card.Subtitle className="mb-4 text-muted">
              {club.nickname}
            </Card.Subtitle>
            <Card.Text>{clubDetails.introduction}</Card.Text>

            <hr className="horizontal-line" />

            <Card.Title id="card-history-heading">Competition</Card.Title>
            <Card.Subtitle className="mb-4 text-muted">
              {club.league}
            </Card.Subtitle>
            <Card.Text>{clubDetails.competition}</Card.Text>

            <hr className="horizontal-line" />

            <Card.Title id="card-history-heading">Triumphs</Card.Title>
            <Card.Subtitle className="mb-4 text-muted">
              European Tournaments
            </Card.Subtitle>
            <Card.Text>{clubDetails.triumphs}</Card.Text>

            <hr className="horizontal-line" />

            <Card.Title id="card-history-heading">Stadium</Card.Title>
            <Card.Subtitle className="mb-4 text-muted">
              Club's stadium
            </Card.Subtitle>
            <Card.Text>{clubDetails.stadium}</Card.Text>

            <hr className="horizontal-line" />

            <Card.Title id="card-history-heading">Legendary Players</Card.Title>
            <Card.Subtitle className="mb-4 text-muted">
              Team Legends
            </Card.Subtitle>
            <Card.Text>{clubDetails.legendaryPlayers}</Card.Text>

            <hr className="horizontal-line" />

            <Card.Title id="card-history-heading">Challenges</Card.Title>
            <Card.Subtitle className="mb-4 text-muted">
              Club Hard Times
            </Card.Subtitle>
            <Card.Text>{clubDetails.challenges}</Card.Text>

            <hr className="horizontal-line" />

            <Card.Title id="card-history-heading">Conclusion</Card.Title>
            <Card.Subtitle className="mb-4 text-muted">
              {club.clubName}
            </Card.Subtitle>
            <Card.Text>{clubDetails.conclusion}</Card.Text>
          </Card.Body>
        </Card>
      </div>
    </Container>
  );
}

export default ClubHistory;
