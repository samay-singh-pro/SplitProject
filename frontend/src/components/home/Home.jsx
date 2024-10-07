import React from "react";
import hero from "../../assets/hero.png";
import info from "../../assets/info.png";
import logo from "../../assets/logo.png";
import split from "../../assets/split.png";
import transaction from "../../assets/transaction.png";
import banner from "../../assets/splitit.png";
import friendly from "../../assets/friendlly.png";
import "./Home.scss";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";

const Home = () => {
  const { userInfo, isAuthenticated } = useSelector((state) => state.login);
  console.log(userInfo);
  return (
    <>
      {isAuthenticated ? (
        <div className="welcome-card">
          <div className="welcome-card__content">
            <h1>Welcome, {userInfo?.username}!</h1>
            <p>We're happy to have you here. Explore your dashboard now.</p>
            <button className="button">
              <Link to="/dashboard">Go to Dashboard</Link>
            </button>
          </div>
        </div>
      ) : (
        ""
      )}
      <div className="hero">
        <div className="hero__details">
          <img src={logo} alt="" />
          <h1>
            <span>D</span>IVIDE WITH EASE
          </h1>
          <h2>SHARE WITH JOY</h2>
          <div className="hero__details__logos">
            <svg
              className="aero fill-current w-9 lg:w-12"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 36 35"
            >
              <path d="M7.844 0L1.961 3.5l11.766 7 3.922 2.333L9.805 17.5 3.922 14 0 16.333l3.922 2.334 1.961 1.166L3.922 21l1.961 1.167V24.5l1.961-1.167v7L11.766 28v-7l7.844-4.667V35l3.922-2.333 1.96-1.167v-7l1.962-1.167V21l-1.961 1.167v-2.334l1.96-1.166v-2.334l-1.96 1.167v-4.667l5.883-3.5L35.298 7V4.667L33.337 3.5l-9.805 5.833L19.61 7l1.961-1.167-1.961-1.166-1.961 1.166-1.961-1.166 1.96-1.167-1.96-1.167L13.727 3.5z"></path>
            </svg>
            <svg
              className="home fill-current w-9 lg:w-12"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 34 32"
            >
              <path d="M27.736 15.229V31.02H20.56V22.6h-7.177v8.423H6.207V15.228l7.176-4.211 3.588-2.106 10.765 6.317zm-.03-6.335l5.412 3.176v2.106H29.53l-12.559-7.37-12.558 7.37H.824V12.07l16.147-9.475 7.177 4.211V.49h3.557v8.405z"></path>
            </svg>
            <svg
              className="heart fill-current w-9 lg:w-12"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 31 29"
            >
              <path d="M15.163 4.311L7.653-.043.143 4.311v15.237l15.02 8.707 15.02-8.707V4.311l-7.51-4.354z"></path>
            </svg>
            <svg
              className="star fill-current w-9 lg:w-12"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 29 30"
            >
              <path d="M11.673.979v9.055L3.519 5.506.461 10.6l8.154 4.528-8.154 4.527L3.52 24.75l8.154-4.528v9.056h6.115V20.22l8.154 4.528L29 19.655l-8.154-4.527L29 10.6l-3.058-5.094-8.154 4.528V.979z"></path>
            </svg>
          </div>
          <div className="hero__details__buttons">
            {!isAuthenticated ? (
              <>
                <button className="primary">
                  <Link to="/login">Sign in</Link>
                </button>
                <button className="secondary">
                  <Link to="/signup">Signup</Link>
                </button>
              </>
            ) : (
              <button>
                <Link className="secondary" to="/dashboard">
                  Go to Dashboard
                </Link>
              </button>
            )}
          </div>
        </div>
        <div className="hero__image">
          <img src={hero} alt="" />
        </div>
      </div>
      <div className="cards">
        <p className="title stylish-border">Our Offerings</p>
        <p className="title_primary">Get more flexibility with&nbsp;Splitit</p>
        <div className="cards__items">
          <div className="item">
            <div className="logo">
              <img src={split} alt="" />
            </div>
            <div className="item_details">
              <h3>Easy Expense Splitting</h3>
              <p>
                Effortlessly split bills and expenses with friends and family.
                Simply enter the total amount and let our app handle the
                calculations. Ensure everyone pays their fair share without any
                hassle.
              </p>
            </div>
            <button className="primary">Read more</button>
          </div>
          <div className="item">
            <div className="logo">
              <img src={info} alt="" />
            </div>
            <div className="item_details">
              <h3>Instant Notifications</h3>
              <p>
                Stay informed with real-time notifications for all your
                transactions. Receive instant alerts whenever someone pays their
                share or when there are updates to your expense splits
              </p>
            </div>
            <button className="primary">Read more</button>
          </div>

          <div className="item">
            <div className="logo">
              <img src={transaction} alt="" />
            </div>
            <div className="item_details">
              <h3>Secure Transactions</h3>
              <p>
                Enjoy peace of mind with our state-of-the-art encryption. Your
                financial data is protected, ensuring that all transactions are
                secure and private
              </p>
            </div>
            <button className="primary">Read more</button>
          </div>
          <div className="item">
            <div className="logo">
              <img src={friendly} alt="" />
            </div>
            <div className="item_details">
              <h3>User Friendly</h3>
              <p>
                Navigate your expenses with ease using our intuitive and
                user-friendly interface. Manage and track your splits
                effortlessly, with a clean design that makes organizing finances
                a breeze.
              </p>
            </div>
            <button className="primary">Read more</button>
          </div>
        </div>
      </div>
      <div className="banner">
        <div className="banner__image">
          <img src={banner} alt="" />
        </div>
        <div className="banner__details">
          <p className="title">
            Effortlessly Split Expenses, Anytime, Anywhere.
          </p>
          <p className="description">
            Track shared bills, settle payments, and keep your finances balanced
            with friends and family—because life’s too short for awkward money
            moments!
          </p>
        </div>
      </div>
      <div className="testimonials">
        <p className="title stylish-border">Our Testimonials</p>
        <p className="title_primary">Real Stories, Real Savings</p>
        <div className="testimonials__cards">
          <div className="card">
            <p>
              “Fundamental” for tracking finances. As good as WhatsApp for
              containing awkwardness.
            </p>
            <h3>- hindustan Times</h3>
          </div>
          <div className="card">
            <p>
              An absolute lifesaver for group expenses! Whether it’s rent or
              groceries, everything is split fairly and tracked seamlessly.
            </p>
            <h3>- Rohit S</h3>
          </div>
          <div className="card">
            <p>
              “I love how easy it is to keep track of shared expenses. The app
              makes settling up hassle-free, especially after group trips.
            </p>
            <h3>- Sonal</h3>
          </div>
          <div className="card">
            <p>
              No more spreadsheets or mental math! This app does it all, and
              it’s super easy to use. Perfect for roommates and families!
            </p>
            <h3>- Pranab</h3>
          </div>
          <div className="card">
            <p>
              Amazing app! It saves so much time and effort in managing shared
              finances, and no one has to worry about who owes what.
            </p>
            <h3>- Prabha S</h3>
          </div>
          <div className="card">
            <p>
              This app has made splitting so simple! No more awkward moments. I
              use it for every trip and dinner outing now.
            </p>
            <h3>- Samay</h3>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
