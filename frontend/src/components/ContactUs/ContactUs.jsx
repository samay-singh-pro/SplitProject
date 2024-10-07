import React from "react";
import "./ContactUs.scss";
import contactImage from "../../assets/contact.svg";

const ContactUs = () => {
  return (
    <div className="contact-us-container">
      <div className="contact-form">
        <h1>Contact Us</h1>
        <form>
          <div className="form-group">
            <label htmlFor="name">Name:</label>
            <input
              type="text"
              id="name"
              placeholder="Enter your name"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              placeholder="Enter your email"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="message">Message:</label>
            <textarea
              id="message"
              placeholder="Enter your message"
              required
            ></textarea>
          </div>
          <button type="submit" className="submit-btn">
            Send Message
          </button>
        </form>
      </div>
      <div className="contact-image">
        <h1>Lets Connect</h1>
        <img src={contactImage} alt="Contact Us" />
      </div>
    </div>
  );
};

export default ContactUs;
