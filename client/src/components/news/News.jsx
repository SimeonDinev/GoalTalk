// import { useState, useEffect } from "react";
// import * as service from "../../services/newsService";
import Card from "react-bootstrap/Card";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";

const News = () => {
  // const [news, setNews] = useState([]);

  // useEffect(() => {
  //   service.getNews().then(setNews);
  // }, []);

  // console.log(news);
  return (
    <>
      {/* {news.map((res, index) => (
        <div key={index}>
          <h1>{res.title}</h1>
          <p>{res.short_desc}</p>
          <img src={res.news_img} alt="news" />
        </div>
      ))} */}
      <Row xs={1} md={2} className="g-4" style={{ margin: "50px 40px " }}>
        {Array.from({ length: 4 }).map((_, idx) => (
          <Col key={idx}>
            <Card
              style={{
                display: "flex",
                flexDirection: "row",
              }}
            >
              <Card.Img
                variant="top"
                src="https://thumbs.dreamstime.com/z/businessman-icon-incognito-unknown-person-silhouette-man-white-background-vector-illustration-male-profile-picture-112802675.jpg"
                style={{
                  height: "150px",
                  width: "100%",
                  borderBottomLeftRadius: "4px",
                }}
              />
              <Card.Body>
                <Card.Title>Card title</Card.Title>
                <Card.Text>
                  This is a longer card with supporting text below as a natural
                  lead-in to additional content. This content is a little bit
                  longer.
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </>
  );
};

export default News;
