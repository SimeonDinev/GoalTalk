import { useState, useEffect } from "react";
import * as service from "../../services/newsService";
import Card from "react-bootstrap/Card";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";

import "./News.css";

const News = () => {
  const [news, setNews] = useState([]);

  useEffect(() => {
    service.getNews().then(setNews);

    return () => {
      console.log("Component will unmount");
    };
  }, []);

  const first10News = news.slice(0, 9);

  return (
    <>
      <Row
        xs={1}
        md={2}
        xl={3}
        className="g-5"
        style={{ margin: "50px 40px " }}
      >
        {first10News.map((res, idx) => (
          <Col key={idx}>
            <Card style={{ height: "100%" }}>
              <Card.Img
                variant="top"
                src={res.news_img}
                style={{
                  flexShrink: "0",
                  borderBottomLeftRadius: "4px",
                  borderBottomRightRadius: "4px",
                }}
              />
              <Card.Body>
                <Card.Title>{res.title}</Card.Title>
                <Card.Text>{res.short_desc}</Card.Text>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </>
  );
};

export default News;
