import React from "react";
import "./OurOffering.scss";
import aboutUs from "../../assets/aboutUs.svg";
import abouUs from "../../assets/abouUs.svg";
import aboutUs2 from "../../assets/aboutUs2.svg";
import offering4 from "../../assets/offering4.svg";
import offering5 from "../../assets/offering5.svg";
import offering1 from "../../assets/offering1.svg";
import offering2 from "../../assets/offering2.svg";
import offering3 from "../../assets/offering3.svg";

const Offerings = () => {
  return (
    <section className="offerings">
      <h1 className="offerings__title">Our Offerings</h1>
      <div className="offerings__devices">
        <h2>We are available on wide range of devices</h2>
        <div className="images">
          <div className="device">
            <h1>Laptops</h1>
            <img src={aboutUs} alt="" />
          </div>
          <div className="device">
            <h1>Personal Computers</h1>
            <img src={abouUs} alt="" />
          </div>
          <div className="device">
            <h1>tablets and phones</h1>
            <img src={aboutUs2} alt="" />
          </div>
        </div>
      </div>
      <div className="offerings__reports">
        <div className="description">
          <h1>"Know where your money goes."</h1>
          <h3>
            Gain insights into your spending habits with detailed reports.
            Understand how much you’ve spent, saved, and split with easy-to-read
            charts and summaries.
          </h3>
        </div>
        <div className="image">
          <img src={offering4} alt="" />
        </div>
      </div>
      <div className="offerings__reports">
        <div className="image">
          <img src={offering5} alt="" />
        </div>
        <div className="description">
          <h1>"Perfect for roommates and subscriptions!"</h1>
          <h3>
            Share rent or subscriptions with roommates or friends? Set up
            recurring expenses, and SplitSmart will handle the rest every month,
            hassle-free.
          </h3>
        </div>
      </div>
      <div className="collage_title">
        <p>"We have you covered for all your expense worries"</p>
        <h2>Spend without worries</h2>
      </div>
      <div className="collage">
      <div className="collage__item collage__item--large">
        <img src={offering1} alt="Image 1" />
      </div>
      <div className="collage__item collage__item--medium">
        <img src={offering2} alt="Image 2" />
      </div>
      <div className="collage__item collage__item--small">
        <img src={offering3} alt="Image 3" />
      </div>
    </div>
    </section>
  );
};

export default Offerings;
