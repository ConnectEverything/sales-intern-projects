package main

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/sessions"
)

const appCookie = "myappcookies"

var cookies *sessions.CookieStore

func Login(w http.ResponseWriter, r *http.Request) {
	//
	// For the sake of simplicity, I am using a global here.
	// You should be using a context.Context instead!
	session, err := cookies.Get(r, appCookie)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		log.Println(err)
		return
	}
	session.Values["userName"] = "StackOverflow"
	session.Save(r, w)
}

func Session(w http.ResponseWriter, r *http.Request) {
	session, err := cookies.Get(r, appCookie)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		log.Println(err)
		return
	}
	w.Write([]byte(fmt.Sprintf("Objects in session: %d\n", len(session.Values))))
	for k, v := range session.Values {
		w.Write([]byte(fmt.Sprintf("Key=%v, Value=%v\n", k, v)))
	}
}

func main() {
	cookies = sessions.NewCookieStore([]byte("mysuperdupersecret"))
	router := mux.NewRouter()
	router.Path("/login").Methods(http.MethodGet).HandlerFunc(Login)
	router.Path("/session").Methods(http.MethodGet).HandlerFunc(Session)
	server := &http.Server{
		Handler: router,
		Addr:    ":5432",
		// Good practice: enforce timeouts for servers you create!
		WriteTimeout: 15 * time.Second,
		ReadTimeout:  15 * time.Second,
	}
	log.Fatal(server.ListenAndServe())
}
