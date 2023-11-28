import Card from "react-bootstrap/Card";

function IntroCard() {
  return (
    <Card
      className="text-center"
      style={{
        margin: "30px 200px",
      }}
    >
      <Card.Header
        style={{
          fontSize: "25px",
          fontWeight: "bolder",
          textTransform: "uppercase",
          padding: "12px 0",
        }}
      >
        History of the sport
      </Card.Header>
      <Card.Body style={{ padding: "60px" }}>
        <blockquote
          style={{
            paddingBottom: "30px",
            fontSize: "20px",
            fontWeight: "600",
            fontStyle: "italic",
          }}
        >
          "Football: where every kick tells a story, and every goal echoes with
          the joy of a universal language."
        </blockquote>
        <Card.Text style={{ fontSize: "18px", paddingBottom: "20px" }}>
          Football, boasts an ancient lineage rooted in various ball games
          played across civilizations. Modern football took shape in
          19th-century England, with standardized rules, notably the 1848
          Cambridge Rules, and the founding of The Football Association in 1863.
          This marked a turning point, leading to the sport's rapid global
          expansion. FIFA's establishment in 1904 formalized international
          football, culminating in the inaugural FIFA World Cup in 1930. Over
          the years, football has become a universal language, fostering unity
          and passion worldwide. Legendary players like Pelé and Diego Maradona,
          alongside modern icons such as Lionel Messi and Cristiano Ronaldo,
          have contributed to football's status as the world's most beloved
          sport, played and watched by millions across continents
        </Card.Text>
      </Card.Body>
    </Card>
  );
}

export default IntroCard;
