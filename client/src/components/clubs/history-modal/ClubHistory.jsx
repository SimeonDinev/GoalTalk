import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getClubsDetail } from "../../../services/clubService";

function ClubHistory() {
  const [club, setClub] = useState({});
  const { clubId } = useParams();

  useEffect(() => {
    getClubsDetail(clubId).then(setClub);
  }, [clubId]);

  return (
    <div>
      <h2>{club.clubName}</h2>
      <p>Enter long description for this Club!in server</p>
    </div>
  );
}

export default ClubHistory;
