import { useState, useEffect } from "react";
import * as service from "../../services/newsService";
import Card from "react-bootstrap/Card";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import LoadingSpinner from "../loading-spinner/LoadingSpinner";

import "./News.css";

const News = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    service.getNews().then(setNews);
    setTimeout(() => {
      setLoading(true);
    }, 1600);
  }, []);

  const first9News = news.slice(0, 9);

  return (
    <div id="wrapper-news">
      {loading ? (
        <>
          <h1 id="news-title">Today news</h1>

          <Row xs={1} md={2} xl={3} className="g-5" id="background-container">
            {first9News.map((res, idx) => (
              <Col key={idx}>
                <a href={res.url}>
                  <Card id="news-card">
                    <Card.Img variant="top" src={res.news_img} />
                    <Card.Body>
                      <Card.Title>{res.title}</Card.Title>
                      <hr className="horizontal-line" />
                      <Card.Text>{res.short_desc}</Card.Text>
                    </Card.Body>
                  </Card>
                </a>
              </Col>
            ))}
          </Row>
        </>
      ) : (
        <LoadingSpinner />
      )}
    </div>
  );
};

export default News;
